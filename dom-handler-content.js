// Copyright (c) 2017 The Lyo Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Separate scope.
 */
(function () {

    /**
    * Current Tab. Need to be fecth before uses.
    */
    var currentTab;

    /**
    * Id of the tab that opened this tab. Need to be fecth before uses.
    */
    var hostTabId;

    /**
     * Send the register request to host tab or main-content.
     */
    function register() {
        let hideval = getSelectedClass();
        let student = (temp = document.getElementById('StudyUnitID')) ? temp.value : undefined;
        let course = document.getElementById('CurriculumID').value;
        let info = Object.assign(getClassInfo(), { hideval: hideval, student: student, course: course });

        let tabId = isPopupPage() ? hostTabId : currentTab.id;

        chrome.runtime.sendMessage({ action: 'register', tab: tabId, info: info });
    }

    /**
     * Enable all class selector.
     */
    function enableAllClassSelector() {
        for (let btn of document.getElementsByClassName('classCheckChon')) {
            btn.disabled = false;
        }
    }

    /**
     * Get the selected class.
     */
    function getSelectedClass() {
        for (let btn of document.getElementsByClassName('classCheckChon')) {
            if (btn.checked) {
                return btn.id;
            }
        }
    }

    /**
     * Get the class information.
     */
    function getClassInfo() {
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
        return { courseName: courseName, class: clazz, lecturer: lecturer, schedule: schedule };
    }

    /**
     * Get original register button.
     * 
     * @returns {HTMLElement}
     */
    function getOriginalRegisterButton() {
        for (let button of document.getElementsByClassName('button')) {
            if (button.value.localeCompare('Đăng ký') == 0 || button.value.localeCompare('Đăng ký học phần') == 0) {
                return button;
            }
        }
    }

    /**
     * Run the loop that find the popup alert and execute the given handler.
     * 
     * @param {function(HTMLElement)} callback Called with the popup container on finded.
     */
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

    /**
     * Insert a popup register button for the given container.
     * 
     * @param {HTMLElement} container Container to insert.
     */
    function insertPopupRegisterButton(container) {
        let template =
            `<a href="javascript:void(0)" class="register-button l-btn" style="margin-left: 10px;">
          <span class="l-btn-left" style="display: flex">
            <img src="${chrome.extension.getURL('icons/icon16.png')}" width="16px" height="16px">
            <span class="l-btn-text">Auto</span>
          </span>
      </a>`;
        container.insertAdjacentHTML('beforeend', template);
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.getElementsByClassName('register-button')[0].onclick = onRegisterButtonClicked;
    }

    /**
     * Insert a popup register button for the given container.
     *  
     * @param {function(HTMLElement)} container Container to insert.
     */
    function insertRegisterButton(container) {
        let template = `
        <input type="button" id="register-button" class="button" value="Auto">
        `;
        container.insertAdjacentHTML('afterend', template);
        document.getElementById('register-button').onclick = onRegisterButtonClicked;
    }

    function replaceSubmitButton() {
        let btn = document.querySelector('input[type="submit"]');
        let template = `<input type="button" class="button" onclick="doSubmit(); AjaxDangKiHocPhan();" value="Đăng ký">`;
        btn.insertAdjacentHTML('afterend', template);
        btn.parentNode.removeChild(btn);
    }

    /**
     * Handle register button clicked.
     */
    function onRegisterButtonClicked() {
        for (let node of document.getElementsByClassName('classCheckChon')) {
            if (node.checked) {
                register();
                if (isPopupPage()) {
                    window.close();
                }
            }
        }
    }

    /**
     * Check if this is a popup page or not.
     * 
     * @returns {boolean}
     */
    function isPopupPage() {
        return window.opener && window.opener != window;
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
        });
    }

    /**
     * Get the id of the tab that opened this tab asynchronous.
     * 
     * @param {function(number)} callback Called with host tab id on success.
     */
    function getHostTabId(callback) {
        chrome.runtime.sendMessage({ action: 'host-tab' }, response => {
            if (response) {
                callback(response.tabId);
            }
        });
    }

    /**
     * Run.
     */
    function run() {

        getCurrentTab(tab => {
            if (!tab) {
                console.error('Cannot get the current tab information. Reload the page to try again.');
                return;
            }
            currentTab = tab;

            // If this tab is a popup, get the host tab id.
            if (isPopupPage()) {
                getHostTabId(id => {
                    if (!id) {
                        console.error('Cannot get the host tab information. Reload the page to try again.');
                        return;
                    }
                    hostTabId = id;

                    replaceSubmitButton();
                });
            }

            enableAllClassSelector();

            insertRegisterButton(getOriginalRegisterButton());

            findPopupAlert(insertPopupRegisterButton);
        });
    }

    run();

})();