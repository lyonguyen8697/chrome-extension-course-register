// Copyright (c) 2014 The Lyo Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var currentTab;
var registers = new Map();
var registerInterval = 200;

function printProccess(course) {
  let item = registers.get(course);
  console.log(`course: ${item.course} class: ${item.class} try: ${item.try} result: ${item.result}`);
}

function sendRegisterRequest(info, callback) {
  let xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState != 4) {
      return;
    }
    if (this.status != 200) {
      callback(false, this.statusText);
      return;
    }
    if (this.responseText.trim() == 'Đăng ký thành công...') {
      callback(true, this.responseText);
      return;
    }
    callback(false, this.responseText);
  }
  xhttp.open('GET', `DangKiHocPhan?StudyUnitID=${info.student}&CurriculumID=${info.course}&Hide=${info.hideval}&t=${Math.random()}`, true);
  xhttp.send();
  printProccess(info.course);
}

function register(info, callback) {
  let item = registers.get(info.course);
  sendRegisterRequest(info, (result, message) => {
    if (result) {
      item.paused = true;
      item.result = true;
    }
    item.message = message;
    callback(item);
  });
  item.try = item.try + 1;
}

function registerLoop(info, interval, begin, complete) {
  let intervalId = setInterval(() => {
    register(info, result => {
      if (result.result) {
        clearInterval(intervalId);
      }
      complete(result);
    });
    begin(item);
  }, interval);

  let item = registers.get(info.course);
  if (item) {
    if (!item.paused) {
      stopRegisterLoop(item);
    }
    item.intervalId = intervalId;
    item.paused = false;
  } else {
    registers.set(info.course, Object.assign(info, { intervalId: intervalId, try: 0, result: false, paused: false }));
  }

  register(info, result => {
    if (result.result) {
      clearInterval(intervalId);
    }
    complete(result);
  });
  begin(item);
}

function startRegisterLoop(info) {
  if (info) {
    registerLoop(info, registerInterval,
      () => {
        saveRegisterLogs(currentTab.id);
      },
      result => {
        if (result.result) {
          saveRegisterLogs(currentTab.id);
          showNotification(result);
        }
      });
  }
}

function stopRegisterLoop(info) {
  if (info) {
    clearInterval(info.intervalId);
    info.paused = true;
  } else {
    registers.forEach(value => {
      clearInterval(value.intervalId);
      value.paused = true;
    });
  }
  saveRegisterLogs(currentTab.id);
}

function resumeRegisterLoop(info) {
  if (info) {
    if (info.paused && !info.result) {
      startRegisterLoop(info);
    }
  } else {
    registers.forEach((value, key) => {
      if (value.paused && !value.result) {
        startRegisterLoop(value);
      }
    });
  }
}

function removeRegitserLoop(info) {
  if (info) {
    clearInterval(info.intervalId);
    registers.delete(info.course);
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
        startRegisterLoop(value);
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
          startRegisterLoop(value);
        }
      });
    }
  });
}

function isLogin() {
  let node = document.getElementsByClassName('menu2')[0];
  if (node) {
    return node.childElementCount != 0;
  }
  return false;
}

function registerButtonClicked(info) {
  if (currentTab) {
    startRegisterLoop(info);
  }
}

function showNotification(info) {
  let option = {
    type: 'basic',
    title: `Course: ${info.courseName} has registered!`,
    message: `Info ${info.class} ${info.lecturer} ${info.schedule}. Registered in ${info.try} try at ${new Date().toLocaleTimeString()}.`,
    iconUrl: 'icon128.png'
  }
  chrome.runtime.sendMessage({ action: 'notification', option: option });
}

function getCurrentTab(callback) {
  chrome.runtime.sendMessage({ action: 'tab-info' }, response => {
    callback(response.tab);
  })
}

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

function listenToRequest() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'is-login':
        sendResponse({ login: isLogin() });
        break;
      case 'register':
        registerButtonClicked(request.info);
        console.log(request.info);
        break;
      case 'stop':
        stopRegisterLoop(registers.get(request.course));
        break;
      case 'start':
        resumeRegisterLoop(registers.get(request.course));
        break;
      case 'remove':
        removeRegitserLoop(registers.get(request.course));
        break;
      case 'interval':
        onIntervalChanged(request.interval);
        break;
      default:
        break;
    }
  });
}

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