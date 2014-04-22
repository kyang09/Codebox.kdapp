domain     = "#{KD.nick()}.kd.io"
OutPath    = "/tmp/_codeboxinstaller.out"
modPath = "/usr/lib/node_modules/codebox"
kdbPath    = "~/.koding-codebox"
runner = 0
resource = "https://rsonbie.kd.io/apps/codebox"

class LogWatcher extends FSWatcher

  fileAdded:(change)->
    {name} = change.file
    [percentage, status] = name.split '-'
    @emit "UpdateProgress", percentage, status
    
class CodeboxInstaller extends KDView

  constructor:->
    super cssClass: "codebox-installer"

  viewAppended:->
  
    KD.singletons.appManager.require 'Terminal', =>

      @addSubView @header = new KDHeaderView
        title         : "Codebox Installer"
        type          : "big"

      @addSubView @toggle = new KDToggleButton
        cssClass        : 'toggle-button'
        style           : "clean-gray"
        defaultState    : "Show details"
        states          : [
          title         : "Show details"
          callback      : (cb)=>
            @terminal.setClass 'in'
            @toggle.setClass 'toggle'
            @terminal.webterm.setKeyView()
            cb?()
        ,
          title         : "Hide details"
          callback      : (cb)=>
            @terminal.unsetClass 'in'
            @toggle.unsetClass 'toggle'
            cb?()
        ]

      @addSubView @logo = new KDCustomHTMLView
        tagName       : 'img'
        cssClass      : 'logo'
        attributes    :
          src         : "https://www.codebox.io/static/images/icons/128.png"

      @watcher = new LogWatcher

      @addSubView @progress = new KDProgressBarView
        initial       : 100
        title         : "Checking installation..."

      @addSubView @terminal = new TerminalPane
        cssClass      : 'terminal'

      @addSubView @button = new KDButtonView
        title         : "Install Codebox"
        cssClass      : 'main-button solid'
        loader        : yes
        callback      : => @installCallback()
       
       @addSubView @uninstall =  new KDButtonView
          title         : "Uninstall"
          cssClass      : 'uninstall-button solid'
          disabled  : true
          callback      : => @uninstallCallback()
          
      @addSubView @link = new KDCustomHTMLView
        cssClass : 'hidden running-link'
        
      @link.setSession = (session)->
        @updatePartial "Click here to launch Codebox: <a target='_blank' href='http://#{domain}:9090'>http://#{domain}:9090</a>"
        @show()

      @addSubView @content = new KDCustomHTMLView
        cssClass : "codebox-help"
        partial  : """

          <p><span class="descb"> NOTE : Let Codebox load if it takes a while. It should run after a little wait. Check the terminal on this app to see progress!</span></p>
          <p>Codebox is a complete and modular Cloud IDE. It can run on any unix-like machine (Linux, Mac OS X). It is an open source component of codebox.io (Cloud IDE as a Service).</p>
          
          <p>The IDE can run on your desktop (Linux or Mac), on your server or the cloud. You can use the codebox.io service to host and manage IDE instances.</p>

        <p>Codebox is built with web technologies: node.js, javascript, html and less. The IDE possesses a very modular and extensible architecture, that allows you to build your own features with through add-ons. Codebox is the first open and modular IDE capable of running both on the Desktop and in the cloud (with offline support).</p>
        """
        
      @checkState()

  checkState:->

    vmc = KD.getSingleton 'vmController'

    @button.showLoader()

    FSHelper.exists "/usr/lib/node_modules/codebox", vmc.defaultVmName, (err, codebox)=>
      warn err  if err
      
      unless codebox
        @link.hide()
        @progress.updateBar 100, '%', "Codebox is not installed."
        @switchState 'install'
      else
        @progress.updateBar 100, '%', "Checking for running instances..."
        @isCodeboxRunning (@session)=>
          if @runner
            message = "Codebox is running."
            @link.setSession session
            @switchState 'stop'
          else
            message = "Codebox  is not running."
            @link.hide()
            @switchState 'run'
            if @_lastRequest is 'run'
              delete @_lastRequest

              modal = KDModalView.confirm
                title       : 'Failed to run Codebox'
                description : 'It might not have been installed to your VM or not configured properly.<br/>Do you want to re-install Codebox?'
                ok          :
                  title     : 'Re-Install'
                  style     : 'modal-clean-green'
                  callback  : =>
                    modal.destroy()
                    @switchState 'install'
                    @installCallback()
                    @button.showLoader()

          @progress.updateBar 100, '%', message
  
  switchState:(state = 'run')->

    @watcher.off 'UpdateProgress'

    switch state
      when 'run'
        title = "Run Codebox"
        style = 'green'
        @uninstall.enable()
        document.getElementsByClassName("uninstall-button")[0].style.visibility = "visible"
        @button.setCallback => @runCallback()
      when 'install'
        title = "Install Codebox"
        style = ' '
        document.getElementsByClassName("uninstall-button")[0].style.visibility = "hidden"
        @button.setCallback => @installCallback()
      when 'stop'
        title = "Stop Codebox"
        style = 'red'
        @button.setCallback => @stopCallback()

    @button.unsetClass 'red green'
    @button.setClass style
    @button.setTitle title or "Run Codebox"
    @button.hideLoader()

  stopCallback:->
    @_lastRequest = 'stop'
    vmc = KD.getSingleton 'vmController'

    vmc.run "pkill -f codebox"
    @terminal.runCommand "sleep 1"
    @terminal.runCommand "fuser -KILL -k -n tcp 9090"
    @runner = 0
    KD.utils.wait 3000, => @checkState()

  runCallback:->
    @_lastRequest = 'run'
    @runner = 1
    @terminal.runCommand "codebox run ./myworkspace --open -p 9090"
    KD.utils.wait 3000, => @checkState()

   uninstallCallback:->
    @terminal.setClass 'in'
    @watcher.on 'UpdateProgress', (percentage, status)=>
      @progress.updateBar percentage, '%', status
      document.getElementsByClassName("bar")[0].style.background =  "#1AAF5D"
      document.getElementsByClassName("bar")[0].childNodes[0].style.textShadow = "0 1px 0 rgba(0,0,0,.4)"
      
      if percentage is "99.99"
       @toggle.setState 'Hide details'
       @terminal.setClass 'in'
       document.getElementsByClassName("bar")[0].style.background = "orange"
       document.getElementsByClassName("bar")[0].childNodes[0].style.textShadow = "0 1px 5px black"   
       setTimeout ( ->
          document.getElementsByClassName("bar")[0].style.background = "#1AAF5D"
          document.getElementsByClassName("bar")[0].childNodes[0].style.textShadow = "0 1px 5px black"
        ), 5000
      else if percentage is "0"
        @button.hideLoader()
        @toggle.setState 'Show details'
        @terminal.unsetClass 'in'
        @toggle.unsetClass 'toggle'
        @switchState 'install'
        @uninstall.disable()
        KD.utils.wait 2500, => @progress.updateBar 100, '%', "Codebox is not installed."

    session = (Math.random() + 1).toString(36).substring 7
    @runner = 1
    tmpOutPath = "#{OutPath}/#{session}"
    vmc = KD.getSingleton 'vmController'
    vmc.run "rm -rf #{OutPath}; mkdir -p #{tmpOutPath}", =>
      @watcher.stopWatching()
      @watcher.path = tmpOutPath
      @watcher.watch()
      @terminal.runCommand "curl --silent https://gist.githubusercontent.com/kyang09/c6708d2074f8e8ee6a26/raw/f713bd0a4fb49c87dc7e30d391cf9b88111bbccc/bashtojs | bash -s #{session}"
  
  
  installCallback:->
    @watcher.on 'UpdateProgress', (percentage, status)=>
      @progress.updateBar percentage, '%', status
      document.getElementsByClassName("bar")[0].style.background =  "#1AAF5D"
      document.getElementsByClassName("bar")[0].childNodes[0].style.textShadow = "0 1px 0 rgba(0,0,0,.4)"
      if percentage is "100"
        @button.hideLoader()
        @toggle.setState 'Show details'
        @terminal.unsetClass 'in'
        @toggle.unsetClass 'toggle'
        @switchState 'run'
      else if percentage is "99.99"
       @toggle.setState 'Hide details'
       @terminal.setClass 'in'
       document.getElementsByClassName("bar")[0].style.background = "orange"
       document.getElementsByClassName("bar")[0].childNodes[0].style.textShadow = "0 1px 5px black"   
       setTimeout ( ->
          document.getElementsByClassName("bar")[0].style.background = "#1AAF5D"
          document.getElementsByClassName("bar")[0].childNodes[0].style.textShadow = "0 1px 5px black"
        ), 5000
      else if percentage is "0"
        @toggle.setState 'Show details'
        @terminal.setClass 'in'
        @toggle.setClass 'toggle'
        @terminal.webterm.setKeyView()

    session = (Math.random() + 1).toString(36).substring 7
    @runner = 1
    tmpOutPath = "#{OutPath}/#{session}"
    vmc = KD.getSingleton 'vmController'
    vmc.run "rm -rf #{OutPath}; mkdir -p #{tmpOutPath}", =>
      @watcher.stopWatching()
      @watcher.path = tmpOutPath
      @watcher.watch()
      @terminal.runCommand "curl --silent https://gist.githubusercontent.com/kyang09/b668d7088708857ae4c6/raw/f22b6826104464c61f3372f7c396fcc6069d652e/installer | bash -s #{session}"
  
  isCodeboxRunning:(callback)->
    vmc = KD.getSingleton 'vmController'
    vmc.run "pgrep -f '.'#{modPath}' -l ", (err, res)->
      if err or res.exitStatus > 0 then callback false
      else callback res.stdout.split(' ').last

        
# -------------

class CodeboxController extends AppController

  constructor:(options = {}, data)->
    options.view    = new CodeboxInstaller
    options.appInfo =
      name : "Codebox"
      type : "application"

    super options, data

do ->

  # In live mode you can add your App view to window's appView
  if appView?

    view = new CodeboxInstaller
    appView.addSubView view

  else

    KD.registerAppClass CodeboxController,
      name     :  "Codebox"
      routes   :
        "/:name?/Codebox" : null
        "/:name?/rsonbie/Apps/Codebox" : null
      dockPath : "/rsonbie/Apps/Codebox"
      behavior : "application"