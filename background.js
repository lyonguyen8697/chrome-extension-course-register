// Copyright (c) 2017 The Lyo Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * A map contains host tab id of the register tab with key is register tab id.
 */
var hostList = new Map();

// When the extension is installed or upgraded ...
chrome.runtime.onInstalled.addListener(function () {
    // Replace all rules ...
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        // With a new rule ...
        chrome.declarativeContent.onPageChanged.addRules([
            {
                // That fires when a page's URL contains a 'g' ...
                conditions: [
                    new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: { hostEquals: 'dkmh.hcmute.edu.vn', schemes: ['https', 'http'] },
                    })
                ],
                // And shows the extension's page action.
                actions: [new chrome.declarativeContent.ShowPageAction()]
            }
        ]);
    });

    /* chrome.webNavigation.onErrorOccurred.addListener(details => {
        if (details.frameId == 0) {
            chrome.tabs.reload(details.tabId);
            console.log(details.url + ' ' + details.tabId);
        }
    },
        { urls: { hostEquals: 'dkmh.hcmute.edu.vn', schemes: ['https', 'http'] } }); */

    // Record the host list.
    chrome.webNavigation.onCreatedNavigationTarget.addListener(details => {
        hostList.set(details.tabId, details.sourceTabId);
    }, {
            urls: {
                schemes: ['https', 'http'],
                hostEquals: 'dkmh.hcmute.edu.vn',
                pathEquals: ['DangKiNgoaiKeHoach', 'DangKiNgoaiKeHoachPhanNhom', 'DangKiTre']
            }
        });

    // Remove data when navigate out.
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
        if (changeInfo.url && !changeInfo.url.includes('://dkmh.hcmute.edu.vn')) {
            chrome.storage.local.remove(tabId.toString());
        }
    });

    // Remove data when the page is closed.
    chrome.tabs.onRemoved.addListener(tabId => {
        chrome.storage.local.remove(tabId.toString());
        
        hostList.delete(tabId);
    });

    // Listen to request
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
            case 'tab-info':
                sendResponse({ tab: sender.tab });
                break;
            case 'host-tab':
                sendResponse({ tabId: hostList.get(sender.tab.id) });
                break;
            case 'notification':
                chrome.notifications.create(request.option);
                break;
            case 'register':
                chrome.tabs.sendMessage(request.tab, { action: request.action, info: request.info });
            default:
                break;
        }
    })
});
