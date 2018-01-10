// Copyright (c) 2014 The Lyo Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var currentTab;
var registerInterval = 200;

function getCurrentTab(callback) {
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, (tabs) => {
    var tab = tabs[0];
    callback(tab);
  });
}


function isLogin(tabId, callback) {
  chrome.tabs.sendMessage(tabId, { action: 'is-login' }, response => {
    callback(response.login);
  });
}

function showContent() {
  var message = document.getElementById('message');
  var content = document.getElementById('content');

  message.hidden = true;
  content.hidden = false;
}

function getUserInfo(callback) {
  var script = 'document.querySelector(".menu2 a").text';

  chrome.tabs.executeScript({
    code: script
  }, result => callback(result[0]));
}

function displayUserInfo() {
  getUserInfo(result => {
    document.getElementById('user-info').innerText = result;
  });
}

function createRegisterList(registers) {
  var list = document.getElementById('register-list');
  removeAllChilds(list);

  registers.forEach(value => {
    let item = createRegisterItem(value);
    list.appendChild(item);
  });

  document.getElementById('place-holder').hidden = registers.size != 0;
}

function createButton(clazz, html, handler) {
  let button = document.createElement('span');
  button.classList.add('btn-inline');
  button.classList.add(clazz);
  button.innerHTML = html;
  button.onclick = handler;

  return button;
}

function createRegisterItem(info) {
  let pauseBtn = createButton('btn-pause', '&#10073;&#10073;', () => stopRegister(info.course));
  let resumeBtn = createButton('btn-resume', '&#9654;', () => startRegister(info.course));
  let removeBtn = createButton('btn-remove', '&times', () => removeRegister(info.course));

  let item = document.createElement('li');
  item.classList.add('register-item');
  if (info.result) {
    item.classList.add('register-item-success')
  }
  if (info.paused) {
    item.classList.add('register-item-paused');
  }
  item.innerHTML = 
  `
  <span class="register-info">[${info.class}] ${info.courseName}</span>
  <span class="register-info">Lecturer: ${info.lecturer}</span>
  <span class="register-info">Schedule: ${info.schedule}</span>
  <span class="register-info">Status: ${info.result ? 'Registered' : info.paused ? 'Paused' : 'Running'} Try: ${info.try}</span>
  <span class="register-info">Last message: ${info.message || 'None'}</span>
  `;
  //item.innerText = `${info.class} ${info.courseName} ${info.lecturer} ${info.schedule} | try: ${info.try} ${info.result ? 'Registered' : info.paused ? 'Paused' : ''}`;

  item.appendChild(pauseBtn);
  item.appendChild(resumeBtn);
  item.appendChild(removeBtn);

  return item;
}

function removeAllChilds(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function getSavedRegisterLogs(callback) {
  chrome.storage.local.get(currentTab.id.toString(), items => {
    callback(chrome.runtime.lastError ? null : items[currentTab.id]);
  });
}

function loadSavedData() {
  getSavedRegisterLogs(logs => {
    if (logs) {
      registerInterval = logs.interval;
      let registers = new Map(logs.registers)

      updateDisplayInterval(registerInterval);

      createRegisterList(registers);

      ajustFunctionButton(registers);
    }
  });
}

function onIntervalChanged() {
  let list = document.getElementById('select-interval');
  let interval = list.value;

  list.value = 0;
  list.options[0].innerText = 'Interval ' + (interval < 1000 ? interval + 'ms' : interval / 1000 + 's');

  if (interval != registerInterval) {
    registerInterval = interval;
    chrome.tabs.sendMessage(currentTab.id, { action: 'interval', interval: registerInterval });
  }
}

function updateDisplayInterval(interval) {
  let list = document.getElementById('select-interval');
  list.value = 0;
  list.options[0].innerText = 'Interval ' + (interval < 1000 ? interval + 'ms' : interval / 1000 + 's');
}

function ajustFunctionButton(registers) {
  registers = [...registers.values()];

  document.getElementById('btn-stop-all').disabled = !registers.some(value => !value.paused);
  document.getElementById('btn-resume-all').disabled = !registers.some(value => value.paused && !value.result);
}

function stopRegister(course) {
  chrome.tabs.sendMessage(currentTab.id, { action: 'stop', course: course });
}

function startRegister(course) {
  chrome.tabs.sendMessage(currentTab.id, { action: 'start', course: course });
}

function removeRegister(course) {
  chrome.tabs.sendMessage(currentTab.id, { action: 'remove', course: course });
}

function registerOnStorageChanged() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName == 'local' && changes[currentTab.id]) {
      let registers = new Map(changes[currentTab.id].newValue.registers);
      createRegisterList(registers);
      ajustFunctionButton(registers);
    }
  });
}

function registerTemplateEvent() {
  document.getElementById('select-interval').onchange = () => onIntervalChanged();
  document.getElementById('btn-stop-all').onclick = () => stopRegister();
  document.getElementById('btn-resume-all').onclick = () => startRegister();
}

function registerEvent() {
  registerOnStorageChanged();
  registerTemplateEvent();
}

function run() {
  getCurrentTab(tab => {
    if (tab) {
      currentTab = tab;

      isLogin(tab.id, result => {
        if (result) {
          loadSavedData();
          registerEvent();
          displayUserInfo();
          showContent();
        }
      });
    } else {
      document.getElementById('message').innerText = 'Error! Reopen this tab to fix this problem';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  run();
});
