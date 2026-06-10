chrome.runtime.onMessage.addListener((e,n,r)=>{if(e.type==="GET_TAB_INFO")return chrome.tabs.query({active:!0,currentWindow:!0},t=>{r({tab:t[0]})}),!0});
