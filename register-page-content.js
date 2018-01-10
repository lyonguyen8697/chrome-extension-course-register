
function register() {
    let hideval = getSelectedClass();
    let StudyUnitID = document.getElementById('StudyUnitID').value; //$('#StudyUnitID').val();
    let CurriculumID = document.getElementById('CurriculumID').value; //$('#CurriculumID').val();
    let tabId = +document.getElementById('tab-id').value;
    let info = Object.assign(getCourseInfo(), { hideval: hideval, student: StudyUnitID, course: CurriculumID });

    chrome.runtime.sendMessage({ action: 'register', tab: tabId, info: info });
    console.log(info);
}

function unlockClassChooserButton() {
    for (let btn of document.getElementsByClassName('classCheckChon')) {
        btn.disabled = false;
    }
}

function getSelectedClass() {
    for (let btn of document.getElementsByClassName('classCheckChon')) {
        if (btn.checked) {
            return btn.id;
        }
    }
}

function getCourseInfo() {
    let courseName = document.getElementsByTagName('legend')[0].children[0].innerText;
    let clazz;
    let lecturer;
    let schedule;
    for (let node of document.getElementsByClassName('classCheckChon')) {
        if (node.checked) {
            clazz = node.parentNode.parentNode.children[1].innerText;
            lecturer = node.parentNode.parentNode.children[7].innerText;
            schedule = node.parentNode.parentNode.children[8].innerText;
        }
    }
    return { courseName: courseName, class: clazz, lecturer: lecturer, schedule: schedule};
}

function findPopupAlert(callback) {
    let match = 'Lớp học phần đã đủ số lượng sinh viên . Vui lòng chọn lớp khác .';
    for (let container of document.getElementsByClassName('messager-button')) {
        if (container
            && container.parentNode.childNodes[1].innerText.trim() == match
            && !container.getElementsByClassName('register-button')[0]) {
            callback(container);
        }
    }
    setTimeout(() => findPopupAlert(callback), 100);
}

function insertRegisterButton(container) {
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
    container.getElementsByClassName('register-button')[0].onclick = register;
}

function replaceSubmitButton() {
    let btn = document.querySelector('input[type="submit"]');
    let template = `<input type="button" class="button" onclick="doSubmit(); AjaxDangKiHocPhan();" value="Đăng ký">`
    btn.insertAdjacentHTML('afterend', template);
    btn.parentNode.removeChild(btn);
}

function registerButtonClicked() {
    register();
    window.close();
}

function getParentTabId() {
    let code = `document.body.innerHTML += ('<input type="hidden" id="tab-id" value=' + tabId + '>')`;
    let script = document.createElement('script');
    script.innerText = code;
    document.body.appendChild(script);
}

function run() {
    getParentTabId();

    unlockClassChooserButton();

    replaceSubmitButton();

    findPopupAlert(insertRegisterButton);
}

run();