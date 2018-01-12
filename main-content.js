// Copyright (c) 2014 The Lyo Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Separate scope.
 */
(function () {

  /**
   * @typedef {Object} RegisterInfo - creates a new type named 'RegisterInfo'
   * @prop {string} student
   * @prop {string} course
   * @prop {string} hideval
   * @prop {string} courseName
   * @prop {string} class
   * @prop {string} lecturer
   * @prop {string} schedule
   * @prop {string} message
   * @prop {boolean} paused
   * @prop {boolean} result
   * @prop {number} try
   */

  /**
   * Current Tab. Need to be fecth before uses.
   */
  var currentTab;

  /**
   * Contain the register information of courses with the key is the course id.
   *
   * @type {Map.<string, RegisterInfo>}
   */
  var registers = new Map();

  /**
   * Interval of the register's loop.
   */
  var registerInterval = 200;

  /**
   * Contain the last message of courses with the key is the course id.
   * @type {Map.<string, string>}
   */
  var lastMessage = new Map();

  /**
   * Message of the successful register.
   */
  const successfulRegisterMessage = 'Đăng ký thành công...';

  /**
   * Message of the already registered.
   */
  const alreadyRegisteredMessage = 'đã đăng ký';

  /**
   * Print the message if it different to previous.
   * 
   * @param  {string} message The last message
   * @param {RegisterInfo} info Register information
   */
  function printMessage(message, info) {
    message = message.trim();
    if (lastMessage.get(info.course) != message) {
      lastMessage.set(info.course, message);
      console.log(`Message: ${message} Course: ${info.courseName} Try: ${info.try}`);
    }
  }

  /**
   * Send register's ajax to server.
   * 
   * @param {RegisterInfo} info Register information.
   * @param {function(boolean, string)} callback Called with the result and the response message.
   */
  function sendRegisterRequest(info, callback) {
    let xhttp = new XMLHttpRequest();

    // On response handler function.
    xhttp.onreadystatechange = function () {

      // Return if the request haven't done yet.
      if (this.readyState != 4) {
        return;
      }
      printMessage(this.responseText, info);

      // Request successful.
      if (this.status == 200) {
        callback(true, this.responseText.trim());
        return;
      }

      // Request failed. Set the response message to the status text instead.
      callback(false, this.statusText);
    }

    xhttp.open('GET', `DangKiHocPhan?StudyUnitID=${info.student}&CurriculumID=${info.course}&Hide=${info.hideval}&t=${Math.random()}`, true);
    xhttp.send();
  }

  /**
   * Check and return the result of register's request via the response message.
   * 
   * @param {string} message The response message.
   * @returns {boolean}
   */
  function isRegistered(message) {
    if (message.includes(successfulRegisterMessage) || message.includes(alreadyRegisteredMessage)) {
      return true;
    }
    return false;
  }

  /**
   *  Register and update course for given information.
   * 
   * @param  {RegisterInfo} info Register information.
   * @param  {function(boolean)} callback Called with the result of the register on request complete.
   */
  function register(info, callback) {
    sendRegisterRequest(info, (result, message) => {

      // Request successful and registerd.
      if (result && isRegistered(message)) {
        info.result = true;
      }
      info.message = message;
      callback(info.result);
    });

    info.try = info.try + 1;
  }

  /**
   * Run the register's loop for the given information and interval.
   * 
   * @param {RegisterInfo} info Register information.
   * @param {number} interval Interval of the register's loop. 
   * @param {function} begin Called on register begin.
   * @param {function(boolean)} complete Called with the result of the register on register complete.
   */
  function registerLoop(info, interval, begin, complete) {

    // Closure function for less code.
    function registerClosureFn() {
      register(info, result => {

        // Ignore the response if already registered and the loop has been terminated.
        if (info.result && info.paused) {
          return;
        }

        // Stop the loop if register's request successful, or already registered.
        if (result || info.result) {
          clearInterval(intervalId);
          info.paused = true;
        }
        complete(result);
      });
      begin();
    }

    // Run the register's loop.
    let intervalId = setInterval(registerClosureFn, interval);

    info.intervalId = intervalId;
    info.paused = false;

    // Start register immediately.
    registerClosureFn();
  }

  /**
   * Start and handle the register's loop for the given information.
   * 
   * @param {RegisterInfo} info Register information.
   */
  function startRegisterLoop(info) {

    // Don't start if already registered.
    if (info && !info.result) {

      // Stop the remaining register's loop if exists.
      if (!info.paused) {
        stopRegisterLoop(info);
      }

      registerLoop(info, registerInterval,

        // On begin.
        () => {
          saveRegisterLogs(currentTab.id);
          if (info.try == 1) {
            showRegisterBeginNotification(info);
          }
        },

        //On complete.
        result => {
          if (result) {
            saveRegisterLogs(currentTab.id);
            showSuccessfulNotification(info);
          }
        });
    }
  }

  /**
   * Stop the register's loop for the given information, or all loop if not given the parameter.
   * 
   * @param {RegisterInfo} [info] Register information. 
   */
  function stopRegisterLoop(info) {

    // Closure function for less code.
    function stopRegisterLoopClosureFn(param) {
      clearInterval(param.intervalId);
      param.paused = true;
    }

    // Stop one.
    if (info) {
      stopRegisterLoopClosureFn(info);
    }
    // Stop all.
    else {
      registers.forEach(stopRegisterLoopClosureFn);
    }

    saveRegisterLogs(currentTab.id);
  }

  /**
   * Resume the paused register's loop for the given information, or all paused loop if not 
   * given the parameter.
   * 
   * @param {RegisterInfo} info Register information. 
   */
  function resumeRegisterLoop(info) {

    // Closure function for less code.  
    function resumeRegisterLoop(param) {
      if (param.paused && !param.result) {
        startRegisterLoop(param);
      }
    }

    // Resume one.
    if (info) {
      resumeRegisterLoop(info);
    }
    // Resume all.
    else {
      registers.forEach(resumeRegisterLoop);
    }
  }

  /**
   * Remove the register's loop for the given information, or all loop if not given the parameter.
   * @param {RegisterInfo} info 
   */
  function removeRegisterLoop(info) {

    // Closure function for less code.
    function removeRegisterLoopClosureFn(param) {
      clearInterval(param.intervalId);
      registers.delete(param.course);
    }

    // Remove one.
    if (info) {
      removeRegisterLoopClosureFn(info);
    }
    // Remove all.
    else {
      registers.forEach(removeRegisterLoopClosureFn);
    }

    saveRegisterLogs(currentTab.id);
  }

  /**
   * Change interval of all register's loop.
   * 
   * @param {number} interval The new interval.
   */
  function onIntervalChanged(interval) {

    // Change if this is a new value.
    if (interval != registerInterval) {
      registerInterval = interval;

      registers.forEach(value => {

        // Start only unsuccessful register's loop.
        if (!value.result) {
          startRegisterLoop(value);
        }
      });
    }
  }

  /**
   * Save register informations for given tab to local chrome storage.
   * 
   * @param {number} id Tab id.
   */
  function saveRegisterLogs(id) {
    let items = {};
    items[id] = { interval: registerInterval, registers: [...registers] };
    chrome.storage.local.set(items);
  }

  /**
   * Get saved register informations for the given tab to local chrome storage.
   * 
   * @param {number} id Tab id.
   * @param {function([string, RegisterInfo][])} callback Called with the saved register informations on success, 
   * or a falsy value if no register information is retrieved.
   */
  function getSavedRegisterLogs(id, callback) {
    chrome.storage.local.get(id.toString(), items => {
      callback(chrome.runtime.lastError ? null : items[id]);
    });
  }

  /**
   * Load and start saved register informations.
   * 
   */
  function loadSavedData() {

    // Get saved data.
    getSavedRegisterLogs(currentTab.id, logs => {
      if (logs) {
        registerInterval = logs.interval;
        registers = new Map(logs.registers);
        registers.forEach(value => {

          // Start if unsuccessful and not paused.
          if (!value.result && !value.paused) {
            startRegisterLoop(value);
          }
        });
      }
    });
  }

  /**
   * Return the register information or create the new one if not exists for given information.
   * 
   * @param {RegisterInfo} info Register information.
   * @returns {RegisterInfo}
   */
  function getOrCreateRegisterInfo(info) {
    let item = registers.get(info.course);
    if (item) {
      return item;
    } else {
      item = Object.assign(info, { try: 0, result: false, paused: false });
      registers.set(item.course, item);
      return item;
    }
  }

  /**
   * Check user login.
   * 
   * @returns {boolean}
   */
  function isLogin() {
    let menu = document.getElementsByClassName('menu2');
    let node = menu ? menu[0] : null;
    if (node) {
      return node.childElementCount != 0;
    }
    return false;
  }

  /**
   * Handle the register button clicked.
   * 
   * @param {RegisterInfo} info Register information. 
   */
  function onRegisterButtonClicked(info) {
    if (currentTab) {
      startRegisterLoop(info);
    }
  }

  /**
   * Show the successful register notification for the given information.
   * 
   * @param {RegisterInfo} info Register information.
   */
  function showSuccessfulNotification(info) {
    let option = {
      type: 'list',
      title: `${info.courseName} has registered!`,
      message: 'Congratulation!',
      iconUrl: 'icons/key.png',
      items: [
        { title: 'Lecturer:', message: info.lecturer },
        { title: 'Schedule:', message: info.schedule },
        { title: 'Class:', message: info.class },
        { title: 'Try:', message: info.try.toString() },
        { title: 'At:', message: new Date().toLocaleTimeString() }
      ],
      priority: 2
    }
    chrome.runtime.sendMessage({ action: 'notification', option: option });
  }

  /**
   * Show the notification when register's loop begin for the given information.
   * 
   * @param {RegisterInfo} info Register information.
   */
  function showRegisterBeginNotification(info) {
    let option = {
      type: 'list',
      title: `Start register ${info.courseName}.`,
      message: 'Being process...',
      iconUrl: 'icons/icon128.png',
      items: [
        { title: 'Lecturer:', message: info.lecturer },
        { title: 'Schedule:', message: info.schedule },
        { title: 'Class:', message: info.class },
        { title: 'Interval:', message: (registerInterval < 1000 ? registerInterval + 'ms' : registerInterval / 1000 + 's') }
      ]
    }
    chrome.runtime.sendMessage({ action: 'notification', option: option });
  }

  /**
   * Get the current tab asynchronous.
   * 
   * @param {function(any)} callback Called with current tab on success.
   */
  function getCurrentTab(callback) {
    chrome.runtime.sendMessage({ action: 'tab-info' }, response => {
      if (response) {
        callback(response.tab);
      }
    })
  }

  /**
   * Override original "Popup*" functions of web page.
   */
  function overridePopupWindowFunction() {
    let code =
      `function PopupDanhSachLop(StudyUnitID, CurriculumID) {
      let w = window.open(AddressUrl + '/' + 'DangKiNgoaiKeHoach/DanhSachLopHocPhan/' + StudyUnitID + "?CurriculumID=" + CurriculumID + "&t=" + Math.random(), '_blank', 'scrollbars=1,status=1,width=800,height=600,');
      w.tabId = ${currentTab.id};
    }
    function PopupDanhSachLopTheoNhom(StudyUnitID, CurriculumID) {
      let w = window.open(AddressUrl + '/' + 'DangKiNgoaiKeHoachPhanNhom/DanhSachLopHocPhanTheoNhom/' + StudyUnitID + "?CurriculumID=" + CurriculumID + "&t=" + Math.random(), '_blank', 'scrollbars=1,status=1,width=800,height=600,');
      w.tabId = ${currentTab.id};

    }
    function PopupDanhSachLopDKT(StudyUnitID , ScheduleStudyUnit) {
      let w = window.open(AddressUrl + '/' + 'DangKiTre/index/?StudyUnitID=' + StudyUnitID + "&ScheduleStudyUnit=" + ScheduleStudyUnit + "&t=" + Math.random(), '_blank', 'scrollbars=1,status=1,width=900,height=600,');
      w.tabId = ${currentTab.id};

    }`
    let script = document.createElement('script');
    script.innerText = code;
    document.body.appendChild(script);
  }

  /**
   * Listen to request.
   */
  function listenToRequest() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'is-login':
          sendResponse({ login: isLogin() });
          break;
        case 'register':
          let info = getOrCreateRegisterInfo(request.info);
          startRegisterLoop(info);
          break;
        case 'stop':
          if (request.course) {
            let info = registers.get(request.course);
            if (info) {
              stopRegisterLoop(info);
            }
          } else {
            stopRegisterLoop();
          }
          break;
        case 'start':
          if (request.course) {
            let info = registers.get(request.course);
            if (info) {
              resumeRegisterLoop(info);
            }
          } else {
            resumeRegisterLoop();
          }
          break;
        case 'remove':
          if (request.course) {
            let info = registers.get(request.course);
            if (info) {
              removeRegisterLoop(info);
            }
          } else {
            removeRegisterLoop();
          }
          break;
        case 'interval':
          onIntervalChanged(request.interval);
          break;
        default:
          break;
      }
    });
  }

  /**
   * Run the fuck up.
   */
  function run() {

    listenToRequest();

    getCurrentTab(tab => {
      currentTab = tab;

      if (isLogin()) {
        loadSavedData();
      } else {
        chrome.storage.local.remove(currentTab.id.toString());
      }

      overridePopupWindowFunction();
    });
  }

  /**
  * Override DialogAlert function
  *
  */
  var code =
    `function DialogAlert(Title, Messages, type) { //override function
    if (Messages.trim() == 'Hiện tại không nằm trong thời hạn đăng ký học phần') {
        $.messager.alert(Title + ' hacker', Messages, type);
    } else {
        $.messager.alert(Title + ' not hacker', Messages, type);        
    }
}`

  var script = document.createElement('script');
  script.textContent = code;
  document.body.appendChild(script);

  run();

})();