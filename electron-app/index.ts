#!/usr/bin/env electron

/*jshint globalstrict:true, node:true*/

"use strict";

var _ = require("lodash");
var appInfo = require("../package.json");
var path = require("path");
var SocketServer = require("./socket-server"); // Implementation of Brackets' shell server
var utils = require("./utils");
var shellConfig = require("./shell-config");
var shellState = require("./shell-state");

var electron = require("electron");
var app = electron.app; // Electron module to control application life
var BrowserWindow = electron.BrowserWindow; // Electron to create native browser window

electron.ipcMain.on('log', function (event, message) {
    console.log('ipc-log:', message);
});

// Report crashes to electron server
// TODO: doesn't work
// electron.crashReporter.start();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
var wins = [];

// fetch window position values from the window and save them to config file
function _saveWindowPosition(sync, win) {
    var size = win.getSize();
    var pos = win.getPosition();
    shellConfig.set("window.posX", pos[0]);
    shellConfig.set("window.posY", pos[1]);
    shellConfig.set("window.width", size[0]);
    shellConfig.set("window.height", size[1]);
    shellConfig.set("window.maximized", win.isMaximized());
    if (sync) {
        shellConfig.saveSync();
    } else {
        shellConfig.save();
    }
}
var saveWindowPositionSync = _.partial(_saveWindowPosition, true);
var saveWindowPosition = _.debounce(_.partial(_saveWindowPosition, false), 100);

// Quit when all windows are closed.
app.on("window-all-closed", function () {
    app.quit();
});

// Start the socket server used by Brackets'
SocketServer.start(function (err, port) {
    if (err) {
        shellState.set("socketServer.state", "ERR_NODE_FAILED");
        console.log("socket-server failed to start: " + utils.errToString(err));
    } else {
        shellState.set("socketServer.state", "NO_ERROR");
        shellState.set("socketServer.port", port);
        console.log("socket-server started on port " + port);
    }
});

function openBracketsWindow(queryObj) {
    queryObj = queryObj || {};

    // compose path to brackets' index file
    var indexPath = "file://" + path.resolve(__dirname, "..", "src", "index.html");

    // build a query for brackets' window
    var queryString = "";
    if (_.isObject(queryObj) && !_.isEmpty(queryObj)) {
        queryString = "?" + _.map(queryObj, function (value, key) {
            return key + "=" + encodeURIComponent(value);
        }).join("&");
    } else if (_.isString(queryObj)) {
        var io1 = queryObj.indexOf("?");
        var io2 = queryObj.indexOf("#");
        if (io1 !== -1) {
            queryString = queryObj.substring(io1);
        } else if (io2 !== -1) {
            queryString = queryObj.substring(io2);
        } else {
            queryString = "";
        }
    }

    var indexUrl = indexPath + queryString;

    var winOptions = {
        title: appInfo.productName,
        icon: path.resolve(__dirname, "res", "appicon.png"),
        x: shellConfig.get("window.posX"),
        y: shellConfig.get("window.posY"),
        width: shellConfig.get("window.width"),
        height: shellConfig.get("window.height"),
        webPreferences: {
            nodeIntegration: false,
            preload: path.resolve(__dirname, "preload.js")
        }
    };

    // create the browser window
    var win = new BrowserWindow(winOptions);
    wins.push(win);

    // load the index.html of the app
    win.loadURL(indexUrl);
    if (shellConfig.get("window.maximized")) {
        win.maximize();
    }

    // emitted when the window is closed
    win.on("closed", function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        var io = wins.indexOf(win);
        if (io !== -1) { wins.splice(io, 1); }
    });

    // this is used to remember the size from the last time
    // emitted before the window is closed
    win.on("close", function () {
        saveWindowPositionSync(win);
    });
    win.on("maximize", function () {
        saveWindowPosition(win);
    });
    win.on("unmaximize", function () {
        saveWindowPosition(win);
    });
    win.on("resize", function () {
        saveWindowPosition(win);
    });
    win.on("move", function () {
        saveWindowPosition(win);
    });

    return win;
}

// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on("ready", function () {
    openBracketsWindow();
});

exports.openBracketsWindow = openBracketsWindow;

exports.getMainWindow = function () {
    return wins[0];
};

exports.restart = function (query) {
    while (wins.length > 0) {
        wins.shift().close();
    }
    openBracketsWindow(query);
};