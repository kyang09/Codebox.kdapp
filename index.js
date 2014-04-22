/* Compiled by kdc on Tue Apr 22 2014 02:56:31 GMT+0000 (UTC) */
(function() {
/* KDAPP STARTS */
/* BLOCK STARTS: /home/rsonbie/Applications/Codebox.kdapp/index.coffee */
var CodeboxController, CodeboxInstaller, LogWatcher, OutPath, domain, kdbPath, modPath, resource, runner, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

domain = "" + (KD.nick()) + ".kd.io";

OutPath = "/tmp/_codeboxinstaller.out";

modPath = "/usr/lib/node_modules/codebox";

kdbPath = "~/.koding-codebox";

runner = 0;

resource = "https://rsonbie.kd.io/apps/codebox";

LogWatcher = (function(_super) {
  __extends(LogWatcher, _super);

  function LogWatcher() {
    _ref = LogWatcher.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  LogWatcher.prototype.fileAdded = function(change) {
    var name, percentage, status, _ref1;
    name = change.file.name;
    _ref1 = name.split('-'), percentage = _ref1[0], status = _ref1[1];
    return this.emit("UpdateProgress", percentage, status);
  };

  return LogWatcher;

})(FSWatcher);

CodeboxInstaller = (function(_super) {
  __extends(CodeboxInstaller, _super);

  function CodeboxInstaller() {
    CodeboxInstaller.__super__.constructor.call(this, {
      cssClass: "codebox-installer"
    });
  }

  CodeboxInstaller.prototype.viewAppended = function() {
    var _this = this;
    return KD.singletons.appManager.require('Terminal', function() {
      _this.addSubView(_this.header = new KDHeaderView({
        title: "Codebox Installer",
        type: "big"
      }));
      _this.addSubView(_this.toggle = new KDToggleButton({
        cssClass: 'toggle-button',
        style: "clean-gray",
        defaultState: "Show details",
        states: [
          {
            title: "Show details",
            callback: function(cb) {
              _this.terminal.setClass('in');
              _this.toggle.setClass('toggle');
              _this.terminal.webterm.setKeyView();
              return typeof cb === "function" ? cb() : void 0;
            }
          }, {
            title: "Hide details",
            callback: function(cb) {
              _this.terminal.unsetClass('in');
              _this.toggle.unsetClass('toggle');
              return typeof cb === "function" ? cb() : void 0;
            }
          }
        ]
      }));
      _this.addSubView(_this.logo = new KDCustomHTMLView({
        tagName: 'img',
        cssClass: 'logo',
        attributes: {
          src: "https://www.codebox.io/static/images/icons/128.png"
        }
      }));
      _this.watcher = new LogWatcher;
      _this.addSubView(_this.progress = new KDProgressBarView({
        initial: 100,
        title: "Checking installation..."
      }));
      _this.addSubView(_this.terminal = new TerminalPane({
        cssClass: 'terminal'
      }));
      _this.addSubView(_this.button = new KDButtonView({
        title: "Install Codebox",
        cssClass: 'main-button solid',
        loader: true,
        callback: function() {
          return _this.installCallback();
        }
      }));
      _this.addSubView(_this.uninstall = new KDButtonView({
        title: "Uninstall",
        cssClass: 'uninstall-button solid',
        disabled: true,
        callback: function() {
          return _this.uninstallCallback();
        }
      }));
      _this.addSubView(_this.link = new KDCustomHTMLView({
        cssClass: 'hidden running-link'
      }));
      _this.link.setSession = function(session) {
        this.updatePartial("Click here to launch Codebox: <a target='_blank' href='http://" + domain + ":9090'>http://" + domain + ":9090</a>");
        return this.show();
      };
      _this.addSubView(_this.content = new KDCustomHTMLView({
        cssClass: "codebox-help",
        partial: "\n  <p><span class=\"descb\"> NOTE : Let Codebox load if it takes a while. It should run after a little wait. Check the terminal on this app to see progress!</span></p>\n  <p>Codebox is a complete and modular Cloud IDE. It can run on any unix-like machine (Linux, Mac OS X). It is an open source component of codebox.io (Cloud IDE as a Service).</p>\n  \n  <p>The IDE can run on your desktop (Linux or Mac), on your server or the cloud. You can use the codebox.io service to host and manage IDE instances.</p>\n\n<p>Codebox is built with web technologies: node.js, javascript, html and less. The IDE possesses a very modular and extensible architecture, that allows you to build your own features with through add-ons. Codebox is the first open and modular IDE capable of running both on the Desktop and in the cloud (with offline support).</p>"
      }));
      return _this.checkState();
    });
  };

  CodeboxInstaller.prototype.checkState = function() {
    var vmc,
      _this = this;
    vmc = KD.getSingleton('vmController');
    this.button.showLoader();
    return FSHelper.exists("/usr/lib/node_modules/codebox", vmc.defaultVmName, function(err, codebox) {
      if (err) {
        warn(err);
      }
      if (!codebox) {
        _this.link.hide();
        _this.progress.updateBar(100, '%', "Codebox is not installed.");
        return _this.switchState('install');
      } else {
        _this.progress.updateBar(100, '%', "Checking for running instances...");
        return _this.isCodeboxRunning(function(session) {
          var message, modal;
          _this.session = session;
          if (_this.runner) {
            message = "Codebox is running.";
            _this.link.setSession(session);
            _this.switchState('stop');
          } else {
            message = "Codebox  is not running.";
            _this.link.hide();
            _this.switchState('run');
            if (_this._lastRequest === 'run') {
              delete _this._lastRequest;
              modal = KDModalView.confirm({
                title: 'Failed to run Codebox',
                description: 'It might not have been installed to your VM or not configured properly.<br/>Do you want to re-install Codebox?',
                ok: {
                  title: 'Re-Install',
                  style: 'modal-clean-green',
                  callback: function() {
                    modal.destroy();
                    _this.switchState('install');
                    _this.installCallback();
                    return _this.button.showLoader();
                  }
                }
              });
            }
          }
          return _this.progress.updateBar(100, '%', message);
        });
      }
    });
  };

  CodeboxInstaller.prototype.switchState = function(state) {
    var style, title,
      _this = this;
    if (state == null) {
      state = 'run';
    }
    this.watcher.off('UpdateProgress');
    switch (state) {
      case 'run':
        title = "Run Codebox";
        style = 'green';
        this.uninstall.enable();
        document.getElementsByClassName("uninstall-button")[0].style.visibility = "visible";
        this.button.setCallback(function() {
          return _this.runCallback();
        });
        break;
      case 'install':
        title = "Install Codebox";
        style = ' ';
        document.getElementsByClassName("uninstall-button")[0].style.visibility = "hidden";
        this.button.setCallback(function() {
          return _this.installCallback();
        });
        break;
      case 'stop':
        title = "Stop Codebox";
        style = 'red';
        this.button.setCallback(function() {
          return _this.stopCallback();
        });
    }
    this.button.unsetClass('red green');
    this.button.setClass(style);
    this.button.setTitle(title || "Run Codebox");
    return this.button.hideLoader();
  };

  CodeboxInstaller.prototype.stopCallback = function() {
    var vmc,
      _this = this;
    this._lastRequest = 'stop';
    vmc = KD.getSingleton('vmController');
    vmc.run("pkill -f codebox");
    this.terminal.runCommand("sleep 1");
    this.terminal.runCommand("fuser -KILL -k -n tcp 9090");
    this.runner = 0;
    return KD.utils.wait(3000, function() {
      return _this.checkState();
    });
  };

  CodeboxInstaller.prototype.runCallback = function() {
    var _this = this;
    this._lastRequest = 'run';
    this.runner = 1;
    this.terminal.runCommand("codebox run ./myworkspace --open -p 9090");
    return KD.utils.wait(3000, function() {
      return _this.checkState();
    });
  };

  CodeboxInstaller.prototype.uninstallCallback = function() {
    var session, tmpOutPath, vmc,
      _this = this;
    this.terminal.setClass('in');
    this.watcher.on('UpdateProgress', function(percentage, status) {
      _this.progress.updateBar(percentage, '%', status);
      document.getElementsByClassName("bar")[0].style.background = "#1AAF5D";
      document.getElementsByClassName("bar")[0].childNodes[0].style.textShadow = "0 1px 0 rgba(0,0,0,.4)";
      if (percentage === "99.99") {
        _this.toggle.setState('Hide details');
        _this.terminal.setClass('in');
        document.getElementsByClassName("bar")[0].style.background = "orange";
        document.getElementsByClassName("bar")[0].childNodes[0].style.textShadow = "0 1px 5px black";
        return setTimeout((function() {
          document.getElementsByClassName("bar")[0].style.background = "#1AAF5D";
          return document.getElementsByClassName("bar")[0].childNodes[0].style.textShadow = "0 1px 5px black";
        }), 5000);
      } else if (percentage === "0") {
        _this.button.hideLoader();
        _this.toggle.setState('Show details');
        _this.terminal.unsetClass('in');
        _this.toggle.unsetClass('toggle');
        _this.switchState('install');
        _this.uninstall.disable();
        return KD.utils.wait(2500, function() {
          return _this.progress.updateBar(100, '%', "Codebox is not installed.");
        });
      }
    });
    session = (Math.random() + 1).toString(36).substring(7);
    this.runner = 1;
    tmpOutPath = "" + OutPath + "/" + session;
    vmc = KD.getSingleton('vmController');
    return vmc.run("rm -rf " + OutPath + "; mkdir -p " + tmpOutPath, function() {
      _this.watcher.stopWatching();
      _this.watcher.path = tmpOutPath;
      _this.watcher.watch();
      return _this.terminal.runCommand("curl --silent https://gist.githubusercontent.com/kyang09/c6708d2074f8e8ee6a26/raw/f713bd0a4fb49c87dc7e30d391cf9b88111bbccc/bashtojs | bash -s " + session);
    });
  };

  CodeboxInstaller.prototype.installCallback = function() {
    var session, tmpOutPath, vmc,
      _this = this;
    this.watcher.on('UpdateProgress', function(percentage, status) {
      _this.progress.updateBar(percentage, '%', status);
      document.getElementsByClassName("bar")[0].style.background = "#1AAF5D";
      document.getElementsByClassName("bar")[0].childNodes[0].style.textShadow = "0 1px 0 rgba(0,0,0,.4)";
      if (percentage === "100") {
        _this.button.hideLoader();
        _this.toggle.setState('Show details');
        _this.terminal.unsetClass('in');
        _this.toggle.unsetClass('toggle');
        return _this.switchState('run');
      } else if (percentage === "99.99") {
        _this.toggle.setState('Hide details');
        _this.terminal.setClass('in');
        document.getElementsByClassName("bar")[0].style.background = "orange";
        document.getElementsByClassName("bar")[0].childNodes[0].style.textShadow = "0 1px 5px black";
        return setTimeout((function() {
          document.getElementsByClassName("bar")[0].style.background = "#1AAF5D";
          return document.getElementsByClassName("bar")[0].childNodes[0].style.textShadow = "0 1px 5px black";
        }), 5000);
      } else if (percentage === "0") {
        _this.toggle.setState('Show details');
        _this.terminal.setClass('in');
        _this.toggle.setClass('toggle');
        return _this.terminal.webterm.setKeyView();
      }
    });
    session = (Math.random() + 1).toString(36).substring(7);
    this.runner = 1;
    tmpOutPath = "" + OutPath + "/" + session;
    vmc = KD.getSingleton('vmController');
    return vmc.run("rm -rf " + OutPath + "; mkdir -p " + tmpOutPath, function() {
      _this.watcher.stopWatching();
      _this.watcher.path = tmpOutPath;
      _this.watcher.watch();
      return _this.terminal.runCommand("curl --silent https://gist.githubusercontent.com/kyang09/b668d7088708857ae4c6/raw/f22b6826104464c61f3372f7c396fcc6069d652e/installer | bash -s " + session);
    });
  };

  CodeboxInstaller.prototype.isCodeboxRunning = function(callback) {
    var vmc;
    vmc = KD.getSingleton('vmController');
    return vmc.run("pgrep -f '.'" + modPath + "' -l ", function(err, res) {
      if (err || res.exitStatus > 0) {
        return callback(false);
      } else {
        return callback(res.stdout.split(' ').last);
      }
    });
  };

  return CodeboxInstaller;

})(KDView);

CodeboxController = (function(_super) {
  __extends(CodeboxController, _super);

  function CodeboxController(options, data) {
    if (options == null) {
      options = {};
    }
    options.view = new CodeboxInstaller;
    options.appInfo = {
      name: "Codebox",
      type: "application"
    };
    CodeboxController.__super__.constructor.call(this, options, data);
  }

  return CodeboxController;

})(AppController);

(function() {
  var view;
  if (typeof appView !== "undefined" && appView !== null) {
    view = new CodeboxInstaller;
    return appView.addSubView(view);
  } else {
    return KD.registerAppClass(CodeboxController, {
      name: "Codebox",
      routes: {
        "/:name?/Codebox": null,
        "/:name?/rsonbie/Apps/Codebox": null
      },
      dockPath: "/rsonbie/Apps/Codebox",
      behavior: "application"
    });
  }
})();

/* KDAPP ENDS */
}).call();