//#region Imports
var sass = require("node-sass"),
    path = require("path"),
    xRegex = require("xregexp").XRegExp;
//#endregion

//#region Handler
var handleSass = function (writer, params) {
    var mapFileName = params.targetFileName + ".map";

    sass.render({
        file: params.sourceFileName,
        includePaths: [path.dirname(params.sourceFileName)],
        precision: parseInt(params.precision, 10),
        outputStyle: params.outputStyle,
       // sourceMap: mapFileName,
        success: function (css, map) {
            map = JSON.parse(map);
            map.file = path.basename(params.targetFileName);
            if (params.autoprefixer != undefined) {
                var autoprefixedOutput = require("./srv-autoprefixer").processAutoprefixer(css, map, params.autoprefixerBrowsers, params.sourceFileName, params.targetFileName);
                css = autoprefixedOutput.css;
                // Curate the sources returned by autoprefix; remove ../ from the start of each source
                var newMaps = JSON.parse(autoprefixedOutput.map);
                newMaps.sources = newMaps.sources.map(function (source) {
                    return source.substr(3, source.length);
                });
                map = newMaps;
            }

            // SASS doesn't generate source-maps without source-map comments
            // (unlike LESS and CoffeeScript). So we need to delete the comment
            // manually if its not present in params.
            if (params.sourceMapURL == undefined) {
                var soucemapCommentLineIndex = css.lastIndexOf("\n");
                if (soucemapCommentLineIndex > 0) {
                    css = css.substring(0, soucemapCommentLineIndex);
                }
            }

            writer.write(JSON.stringify({
                Success: true,
                Remarks: "Successful!",
                Output: {
                    Content: css,
                    Map: map
                }
            }));
            writer.end();
        },
        error: function (error) {
            var regex = xRegex.exec(error, xRegex("(?<fileName>.+):(?<line>.\\d+): error: (?<fullMessage>(?<message>.*))", 'gi'));
            writer.write(JSON.stringify({
                Success: false,
                Remarks: "SASS: An error has occured while processing your request.",
                Details: regex.message,
                Errors: {
                    Line: regex.line,
                    Message: regex.message,
                    FileName: regex.fileName,
                    FullMessage: regex.fullMessage
                }
            }));
            writer.end();
        }
    });
};
//#endregion

//#region Exports
module.exports = handleSass;
//#endregion
