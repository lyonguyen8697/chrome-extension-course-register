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
   * Get the current tab asynchronous.
   * 
   * @param {function(any)} callback Called with current tab on success.
   */
  function getCurrentTab(callback) {
    var queryInfo = {
      active: true,
      currentWindow: true
    };

    chrome.tabs.query(queryInfo, tabs => {
      var tab = tabs[0];
      callback(tab);
    });
  }

  /**
   * Check user login asynchronous for the given tab id.
   * 
   * @param {number} tabId Id of the tab that need to be check.
   * @param {function(any)} callback Called with result on complete.
   */
  function isLogin(tabId, callback) {
    chrome.tabs.sendMessage(tabId, { action: 'is-login' }, response => {
      callback(response.login);
    });
  }

  /**
   * Show the register panel, also hide the alert message.
   */
  function showRegisterPanel() {
    var message = document.getElementById('alert-message');
    var panel = document.getElementById('register-panel');

    message.hidden = true;
    panel.hidden = false;
  }

  /**
   * Get the user information asynchronous for the given tab id.
   * 
   * @param {number} tabId Id of the tab to get user information.
   * @param {function(string)} callback Called with user information on complete.
   */
  function getUserInfo(tabId, callback) {
    var script = 'document.querySelector(".menu2 a").text';

    chrome.tabs.executeScript(tabId, {
      code: script
    }, result => callback(result[0]));
  }

  /**
   * Get and display user information for the given tab id.
   * 
   *  @param {number} tabId Id of the tab to get user information.
   */
  function displayUserInfo(tabId) {
    getUserInfo(tabId, result => {
      document.getElementById('user-info').innerText = result;
    });
  }

  /**
   * Update the register list for the given information.
   * 
   * @param {Map.<string, RegisterInfo>} registers A map contains register informations.
   */
  function updateRegisterList(registers) {
    let list = document.getElementById('register-list');

    // Remove redundant children.
    while (list.children.length > registers.size) {
      list.removeChild(list.firstChild);
    }

    // Update or create new element.
    let index = 0;
    registers.forEach(value => {
      let element = list.children[index++];
      if (element) {
        updateRegisterItem(element, value);
      } else {
        element = createRegisterItem(value);
        list.appendChild(element);
      }
    });

    // Display the place holder message if the list empty.
    document.getElementById('place-holder').hidden = registers.size != 0;
  }

  /**
   * Create a li element that display for the given register information.
   * 
   * @param {RegisterInfo} info Register information.
   * @returns {HTMLLIElement}
   */
  function createRegisterItem(info) {

    // Create function buttons.
    let pauseBtn = createHTMLElement({
      tagName: 'span',
      className: 'btn-inline btn-pause',
      inner: '&#10073;&#10073;',
      attributes: [{ name: 'data-course', value: info.course }],
      onclick: onStopButtonClicked
    });
    let resumeBtn = createHTMLElement({
      tagName: 'span',
      className: 'btn-inline btn-resume',
      inner: '&#9654;',
      attributes: [{ name: 'data-course', value: info.course }],
      onclick: onStartButtonClicked
    });
    let removeBtn = createHTMLElement({
      tagName: 'span',
      className: 'btn-inline btn-remove',
      inner: '&times',
      attributes: [{ name: 'data-course', value: info.course }],
      onclick: onRemoveButtonClicked
    });

    // Create display element.
    let spanTitle = createHTMLElement({
      tagName: 'span',
      inner: `[${info.class}] ${info.courseName}`,
      className: 'register-info'
    });
    let spanLecturer = createHTMLElement({
      tagName: 'span',
      inner: `Lecturer: ${info.lecturer}`,
      className: 'register-info'
    });
    let spanSchedule = createHTMLElement({
      tagName: 'span',
      inner: `Schedule: ${info.schedule}`,
      className: 'register-info'
    });
    let spanStatus = createHTMLElement({
      tagName: 'span',
      inner: `Status: ${info.result ? 'Registered' : info.paused ? 'Paused' : 'Running'} Try: ${info.try}`,
      className: 'register-info'
    });
    let spanLastMessage = createHTMLElement({
      tagName: 'span',
      inner: `Last message: ${info.message || 'Pending'}`,
      className: 'register-info'
    });

    // Create container.
    let element = createHTMLElement({ tagName: 'li' });
    element.classList.add('register-item');
    if (info.result) {
      element.classList.add('register-item-success');
    }
    if (info.paused) {
      element.classList.add('register-item-paused');
    }

    // Add element.
    element.appendChild(spanTitle);
    element.appendChild(spanLecturer);
    element.appendChild(spanSchedule);
    element.appendChild(spanStatus);
    element.appendChild(spanLastMessage);

    element.appendChild(pauseBtn);
    element.appendChild(resumeBtn);
    element.appendChild(removeBtn);

    return element;
  }

  /**
   * Update the display information for the given li element.
   * 
   * @param {HTMLLIElement} element Li element to update.
   * @param {RegisterInfo} info Register information.
   */
  function updateRegisterItem(element, info) {
    if (info.result) {
      element.classList.add('register-item-success');
    } else {
      element.classList.remove('register-item-success');
    }

    if (info.paused) {
      element.classList.add('register-item-paused');
    } else {
      element.classList.remove('register-item-paused');
      console.log('removed');
    }

    element.children[0].innerText = `[${info.class}] ${info.courseName}`;
    element.children[1].innerText = `Lecturer: ${info.lecturer}`;
    element.children[2].innerText = `Schedule: ${info.schedule}`;
    element.children[3].innerText = `Status: ${info.result ? 'Registered' : info.paused ? 'Paused' : 'Running'} Try: ${info.try}`;
    element.children[4].innerText = `Last message: ${info.message || 'Pending'}`;

    element.children[5].setAttribute('data-course', info.course);
    element.children[6].setAttribute('data-course', info.course);
    element.children[7].setAttribute('data-course', info.course);
  }

  /**
   * Create a html element for the given option.
   * 
   * @param {{tagName: string, inner?: string, id?: string, className?: string, attributes: {name: string, value: string}[], onclick?: function(HTMLElement, MouseEvent)}} option
   * @returns {HTMLElement}
   */
  function createHTMLElement(option) {
    let element = document.createElement(option.tagName);
    if (option.inner) {
      element.innerHTML = option.inner;
    }
    if (option.id) {
      element.id = option.id;
    }
    if (option.className) {
      element.className = option.className;
    }
    if (option.onclick) {
      element.onclick = option.onclick;
    }
    if (option.attributes) {
      option.attributes.forEach(attr => element.setAttribute(attr.name, attr.value));
    }
    return element;
  }

  /**
   * Get saved register informations for the given tab id from local chrome storage.
   * 
   * @param {number} tabId Id of the tab to get saved data.
   * @param {function([string, RegisterInfo][])} callback Called with the saved register informations on success, 
   * or a falsy value if no register information is retrieved.
   */
  function getSavedRegisterLogs(tabId, callback) {
    chrome.storage.local.get(tabId.toString(), items => {
      callback(chrome.runtime.lastError ? null : items[tabId]);
    });
  }

  /**
   * Load and display saved data for the given tab id.
   * 
   * @param {number} tabId Id of the tab to load data.
   */
  function loadSavedData(tabId) {
    getSavedRegisterLogs(tabId, logs => {
      if (logs) {
        registers = new Map(logs.registers);
        registerInterval = logs.interval;

        updateDisplayInterval(registerInterval);

        updateRegisterList(registers);

        ajustFunctionButtons(registers);
      }
    });
  }

  /**
   * Update display interval for the given value.
   * 
   * @param {number} interval Value to update. 
   */
  function updateDisplayInterval(interval) {
    let list = document.getElementById('select-interval');
    list.value = 0;
    list.options[0].innerText = 'Interval ' + (interval < 1000 ? interval + 'ms' : interval / 1000 + 's');
  }

  /**
   * Handle the select interval changed.
   */
  function onIntervalChanged() {

    // Get the selector and keep the selected value.
    let list = document.getElementById('select-interval');
    let interval = list.value;

    // Zero value of the selector is for the differrent display text.
    list.value = 0;
    list.options[0].innerText = 'Interval ' + (interval < 1000 ? interval + 'ms' : interval / 1000 + 's');

    // Only changed if selected differrent value.
    if (interval != registerInterval) {
      registerInterval = interval;

      // Send to content script handling.
      if (currentTab) {
        chrome.tabs.sendMessage(currentTab.id, { action: 'interval', interval: registerInterval });
      }
    }
  }

  /**
   * Enable or disable function buttons according to the given informations.
   * 
   * @param {Map.<string, RegisterInfo>} registers A map contains register informations.
   */
  function ajustFunctionButtons(registers) {
    registers = [...registers.values()];

    document.getElementById('btn-stop-all').disabled = !registers.some(value => !value.paused);
    document.getElementById('btn-resume-all').disabled = !registers.some(value => value.paused && !value.result);
  }

  /**
   * Send request to stop the register for the given course id;
   * 
   * @param {number} tabId Id of the tab to stop.
   * @param {string} course Id of course to stop.
   */
  function stopRegister(tabId, course) {
    chrome.tabs.sendMessage(tabId, { action: 'stop', course: course });
  }

  /**
   * Send request to start the register for the given course id;
   * 
   * @param {number} tabId Id of the tab to start.
   * @param {string} course Id of course to start. 
  */
  function startRegister(tabId, course) {
    chrome.tabs.sendMessage(tabId, { action: 'start', course: course });
  }

  /**
   * Send request to remove the register for the given course id;
   * 
   * @param {number} tabId Id of the tab to remove.
   * @param {string} course Id of course to remove. 
  */
  function removeRegister(tabId, course) {
    chrome.tabs.sendMessage(tabId, { action: 'remove', course: course });
  }

  /**
  * Handle stop button clicked.
  * 
  * @param {MouseEvent} event Event object.
  */
  function onStopButtonClicked(event) {
    if (currentTab) {
      let course = event.target.getAttribute('data-course');
      stopRegister(currentTab.id, course);
    }
  }

  /**
   * Handle start button clicked.
   * 
   * @param {MouseEvent} event Event object.
   */
  function onStartButtonClicked(event) {
    if (currentTab) {
      let course = event.target.getAttribute('data-course');
      startRegister(currentTab.id, course);
    }
  }

  /**
    * Handle remove button clicked.
    * 
    * @param {MouseEvent} event Event object.
    */
  function onRemoveButtonClicked(event) {
    if (currentTab) {
      let course = event.target.getAttribute('data-course');
      removeRegister(currentTab.id, course);
    }
  }

  /**
   * Listen to storage changed for the given tab id.
   * 
   * @param {number} tabId Id of the tab to listen.
   */
  function listenToStorageChanged(tabId) {
    chrome.storage.onChanged.addListener((changes, areaName) => {

      // Only listen to local storage.
      if (areaName == 'local' && changes[tabId]) {
        registers = new Map(changes[tabId].newValue.registers);

        updateRegisterList(registers);

        ajustFunctionButtons(registers);
      }
    });
  }

  /**
   * Listen to template event for the given tab id.
   */
  function listenToTemplateEvent() {
    document.getElementById('select-interval').onchange = () => onIntervalChanged();
    document.getElementById('btn-stop-all').onclick = onStopButtonClicked;
    document.getElementById('btn-resume-all').onclick = onStartButtonClicked;
  }

  /**
   * Listen to event for the given tab id.
   * 
   * @param {number} tabId Id of the tab to listen.
   */
  function listenToEvent(tabId) {
    listenToStorageChanged(tabId);
    listenToTemplateEvent();
  }

  /**
   * Run.
   */
  function run() {
    getCurrentTab(tab => {
      if (tab) {
        currentTab = tab;

        isLogin(tab.id, result => {
          if (result) {
            loadSavedData(tab.id);
            listenToEvent(tab.id);
            displayUserInfo(tab.id);
            showRegisterPanel();
          }
        });
      } else {
        document.getElementById('alert-message').innerText = 'Error! Reopen this tab to fix this problem';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    run();
  });

})();