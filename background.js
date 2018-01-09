// Copyright (c) 2017 The Lyo Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
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

    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
        if (changeInfo.url && !changeInfo.url.includes('://dkmh.hcmute.edu.vn')) {
            chrome.storage.local.remove(tabId.toString());
        }
    })

    chrome.tabs.onRemoved.addListener(tabId => {
        chrome.storage.local.remove(tabId.toString());
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
            case 'tab-info':
                sendResponse({ tab: sender.tab });
                break;
            case 'notification':
                chrome.notifications.create(request.option);
                break;
            default:
                break;
        }
    })
});
