/**
 * Imports
 */

var stackTrace = require('stack-trace')
var SourceMapConsumer = require('source-map').SourceMapConsumer
var path = require('path')

exports.get = getSourceMaps
exports.stack = prepareStackTrace

var reSourceMap = /^data:application\/json[^,]+base64,/;
function getSourceMaps (content) {
  //        //# sourceMappingURL=foo.js.map                       /*# sourceMappingURL=foo.js.map */
  var re = /(?:\/\/[@#][ \t]+sourceMappingURL=([^\s'"]+?)[ \t]*$)|(?:\/\*[@#][ \t]+sourceMappingURL=([^\*]+?)[ \t]*(?:\*\/)[ \t]*$)/mg;
  // Keep executing the search to find the *last* sourceMappingURL to avoid
  // picking up sourceMappingURLs from comments, strings, etc.
  var lastMatch, match;
  while (match = re.exec(content)) lastMatch = match;
  if (!lastMatch) return null;
  var sourceMappingURL = lastMatch[1]
  var rawData = sourceMappingURL.slice(sourceMappingURL.indexOf(',') + 1)
  return new SourceMapConsumer(new Buffer(rawData, "base64").toString())
}

function prepareStackTrace(map, error, base) {
  base = base || ''
  var stack = stackTrace.parse(error)

  return getErrorSource(base, map, stack[0]) + error + stack.map(function(frame) {
    return '\n    at ' + wrapCallSite(base, map, frame);
  }).join('');
}


function getErrorSource(base, map, topFrame) {
  var position = getPosition(map, topFrame)
  var original = map.sourceContentFor(position.source)
  var code = original.split(/(?:\r\n|\r|\n)/)[position.line - 1];
  return path.resolve(path.join(base, position.source)) + ':' + position.line + '\n' + code + '\n' +
    new Array(position.column + 3).join(' ') + '^\n\n';
}

function wrapCallSite(base, map, frame) {
  // Most call sites will return the source file from getFileName(), but code
  // passed to eval() ending in "//# sourceURL=..." will return the source file
  // from getScriptNameOrSourceURL() instead
  var position = getPosition(map, frame)
  frame = cloneCallSite(frame);
  if (!position.source) return frame
  frame.getFileName = function() { return path.resolve(path.join(base, position.source)) };
  frame.getLineNumber = function() { return position.line; };
  frame.getColumnNumber = function() { return position.column + 1; };
  frame.getScriptNameOrSourceURL = function() { return position.source; };
  return frame;

}

function getPosition(map, frame) {
  var source = frame.getFileName()
  var line = frame.getLineNumber();
  var column = frame.getColumnNumber() - 1;

  // Fix position in Node where some (internal) code is prepended.
  // See https://github.com/evanw/node-source-map-support/issues/36
  if (line === 1) {
    column -= 62;
  }
  return map.originalPositionFor({
    source: source,
    line: line,
    column: column
  });
}

function cloneCallSite(frame) {
  var object = {};
  Object.getOwnPropertyNames(Object.getPrototypeOf(frame)).forEach(function(name) {
    object[name] = /^(?:is|get)/.test(name) ? function() { return frame[name].call(frame); } : frame[name];
  });
  object.toString = CallSiteToString;
  return object;
}

// This is copied almost verbatim from the V8 source code at
// https://code.google.com/p/v8/source/browse/trunk/src/messages.js. The
// implementation of wrapCallSite() used to just forward to the actual source
// code of CallSite.prototype.toString but unfortunately a new release of V8
// did something to the prototype chain and broke the shim. The only fix I
// could find was copy/paste.
function CallSiteToString() {
  var fileName;
  var fileLocation = "";
  if (this.isNative()) {
    fileLocation = "native";
  } else {
    fileName = this.scriptNameOrSourceURL && this.scriptNameOrSourceURL() || this.getFileName();
    if (!fileName && this.isEval && this.isEval()) {
      fileLocation = this.getEvalOrigin();
      fileLocation += ", ";  // Expecting source position to follow.
    }

    if (fileName) {
      fileLocation += fileName;
    } else {
      // Source code does not originate from a file and is not native, but we
      // can still get the source position inside the source string, e.g. in
      // an eval string.
      fileLocation += "<anonymous>";
    }
    var lineNumber = this.getLineNumber();
    if (lineNumber != null) {
      fileLocation += ":" + lineNumber;
      var columnNumber = this.getColumnNumber();
      if (columnNumber) {
        fileLocation += ":" + columnNumber;
      }
    }
  }

  var line = "";
  var functionName = this.getFunctionName();
  var addSuffix = true;
  var isConstructor = this.isConstructor && this.isConstructor();
  var isMethodCall = !(this.isToplevel && this.isToplevel() || isConstructor);
  if (isMethodCall) {
    var typeName = this.getTypeName();
    var methodName = this.getMethodName();
    if (functionName) {
      if (typeName && functionName.indexOf(typeName) != 0) {
        line += typeName + ".";
      }
      line += functionName;
      if (methodName && functionName.indexOf("." + methodName) != functionName.length - methodName.length - 1) {
        line += " [as " + methodName + "]";
      }
    } else {
      line += typeName + "." + (methodName || "<anonymous>");
    }
  } else if (isConstructor) {
    line += "new " + (functionName || "<anonymous>");
  } else if (functionName) {
    line += functionName;
  } else {
    line += fileLocation;
    addSuffix = false;
  }
  if (addSuffix) {
    line += " (" + fileLocation + ")";
  }
  return line;
}

// Parses code generated by FormatEvalOrigin(), a function inside V8:
// https://code.google.com/p/v8/source/browse/trunk/src/messages.js
function mapEvalOrigin(origin) {
  // Most eval() calls are in this format
  var match = /^eval at ([^(]+) \((.+):(\d+):(\d+)\)$/.exec(origin);
  if (match) {
    var position = mapSourcePosition({
      source: match[2],
      line: match[3],
      column: match[4] - 1
    });
    return 'eval at ' + match[1] + ' (' + position.source + ':' +
      position.line + ':' + (position.column + 1) + ')';
  }

  // Parse nested eval() calls using recursion
  match = /^eval at ([^(]+) \((.+)\)$/.exec(origin);
  if (match) {
    return 'eval at ' + match[1] + ' (' + mapEvalOrigin(match[2]) + ')';
  }

  // Make sure we still return useful information if we didn't find anything
  return origin;
}
