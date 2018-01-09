// Copyright (c) 2014 The Lyo Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var currentTab;
var registers = new Map();
var registerInterval = 200;

function registerCourse(course, callback) {
  if (Math.random() * 100 < 5) {
    callback(true);
  } else {
    callback(false);
  }
  //console.log('Register course: ' + course + '  try: ' + registers.get(course).try + (registers.get(course).result ? '  success' : ''));
}

function register(course, callback) {
  let item = registers.get(course);
  registerCourse(course, result => {
    if (result) {
      item.paused = true;
      item.result = true;
    }
    callback(result);
  });
  item.try = item.try + 1;
}

function registerLoop(course, interval, begin, complete) {
  let id = setInterval(() => {
    register(course, result => {
      if (result) {
        clearInterval(id);
      }
      complete(result);
    });
    begin(item);
  }, interval);

  let item = registers.get(course);
  if (item) {
    if (!item.paused) {
      stopRegisterLoop(course);
    }
    item.id = id;
    item.paused = false;
  } else {
    registers.set(course, { id: id, try: 0, result: false, paused: false });
  }

  register(course, result => {
    if (result) {
      clearInterval(id);
    }
    complete(result);
  });
  begin(item);
}

function startRegisterLoop(course) {
  if (course) {
    registerLoop(course, registerInterval,
      item => {
        saveRegisterLogs(currentTab.id);
      },
      result => {
        if (result.result) {
          saveRegisterLogs(currentTab.id);
          showNotification(course, result.try);
        }
      });
  }
}

function stopRegisterLoop(course) {
  if (course) {
    let item = registers.get(course);
    clearInterval(item.id);
    item.paused = true;
  } else {
    registers.forEach(value => {
      clearInterval(value.id);
      value.paused = true;
    });
  }
  saveRegisterLogs(currentTab.id);
}

function resumeRegisterLoop(course) {
  if (course) {
    let item = registers.get(course);
    if (item.paused && !item.result) {
      startRegisterLoop(course);
    }
  } else {
    registers.forEach((value, key) => {
      if (value.paused && !value.result) {
        startRegisterLoop(key);
      }
    });
  }
}

function removeRegitserLoop(course) {
  if (course) {
    clearInterval(registers.get(course).id);
    registers.delete(course);
  } else {
    registers.clear();
  }
  saveRegisterLogs(currentTab.id);
}

function onIntervalChanged(interval) {
  if (interval != registerInterval) {
    registerInterval = interval;
    registers.forEach((value, key) => {
      if (!value.result) {
        startRegisterLoop(key);
      }
    });
    saveRegisterLogs(currentTab.id);
  }
}

function saveRegisterLogs(id) {
  let items = {};
  items[id] = { interval: registerInterval, registers: [...registers] };
  chrome.storage.local.set(items);
}

function getSavedRegisterLogs(id, callback) {
  chrome.storage.local.get(id.toString(), items => {
    callback(chrome.runtime.lastError ? null : items[id]);
  });
}

function loadSavedData() {
  getSavedRegisterLogs(currentTab.id, logs => {
    if (logs) {
      registerInterval = logs.interval;
      registers = new Map(logs.registers);
      registers.forEach((value, key) => {
        if (!value.result && !value.paused) {
          startRegisterLoop(key);
        }
      });
    }
  });
}

function isLogin() {
  return document.getElementsByClassName("menu2")[0].childElementCount != 0;
}

function registerButtonClicked(event) {
  event.preventDefault();
  if (currentTab) {
    var course = Math.floor(Math.random() * 1000);

    startRegisterLoop(course);
  }
}

function showNotification(course, tryTimes) {
  let option = {
    type: 'basic',
    title: `Course: ${course} has registered!`,
    message: `Register success in ${tryTimes} try.`,
    iconUrl: 'icon.png'
  }
  chrome.runtime.sendMessage({ action: 'notification', option: option });
}

function getCurrentTab(callback) {
  chrome.runtime.sendMessage({ action: 'tab-info' }, response => {
    callback(response.tab);
  })
}

function createRegisterButton(container) {
  let template =
    `<a href="javascript:void(0)" class="register-button l-btn" style="margin-left: 10px;">
        <span class="l-btn-left" style="display: flex">
          <img src="${chrome.extension.getURL('icon16.png')}" width="16px" height="16px">
          <span class="l-btn-text">Auto</span>
        </span>
    </a>`;
  container.insertAdjacentHTML('beforeend', template);
  container.style.display = 'flex';
  container.style.justifyContent = 'center';
  container.getElementsByClassName('register-button')[0].onclick = registerButtonClicked;
}

function findPopupAlert(callback) {
  let text = 'Hiện tại không nằm trong thời hạn đăng ký học phần';
  for (let container of document.getElementsByClassName('messager-button')) {
    if (container
      && container.parentNode.childNodes[1].innerText.trim() == text
      && !container.getElementsByClassName('register-button')[0]) {
      callback(container);
    }
  }
  setTimeout(() => findPopupAlert(callback), 100);
}

function run() {

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'is-login':
        sendResponse({ login: isLogin() });
        break;
      default:
        break;
    }
  });

  chrome.runtime.onConnect.addListener(port => {
    port.onMessage.addListener(message => {
      switch (message.action) {
        case 'stop':
          stopRegisterLoop(message.course);
          break;
        case 'start':
          resumeRegisterLoop(message.course);
          break;
        case 'remove':
          removeRegitserLoop(message.course);
          break;
        case 'interval':
          onIntervalChanged(message.interval);
          break;
        default:
          break;
      }
    });
  });

  getCurrentTab(tab => {
    currentTab = tab;

    if (isLogin()) {
      loadSavedData();
    } else {
      chrome.storage.local.remove(currentTab.id.toString());
    }
  });

  findPopupAlert(createRegisterButton);
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