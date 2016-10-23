Design Document
===============

Goals
-----

- small extension size and memory footprint
- packed with essential features
- should not contain bloated or rarely used features
- should not slow the browser down


Feature Set
===========

Extension Pop-up
-----------------

- Status Section:
    - Display status of current tab
    - Status: Display user-friendly text derived from suspender's state

- Suspension Commands:
    - Suspend Tab: Suspend current tab.
    - Suspend All Tabs: Suspend all tabs in current browser window
    - Suspend Other Tabs: Suspend all tabs in current browser window except the 
      foreground tab

- Tab Restore Commands:
    - Restore Tab: Restore current tab (if suspended)
    - Restore All Suspended Tabs: Restore all suspended tabs in current browser 
      window

- Automatic Suspension Commands:
    - Disable automatic suspension for an hour
    - Enable automatic suspension
    - Disable automatic suspension on this tab: Prevent automatic suspension for current 
      tab
    - Enable automatic suspension on this tab

- Whitelisting
    - Add current page to whitelist

- Settings Section:
    - Settings: Open settings page
    - Quick settings:
        - Automatically suspend backgroud tabs after (minutes)


Settings
--------

- Automatically suspend backgroud tabs after (minutes):
- Whitelist:
- Automatically restore suspended tab when brought to foreground


Internals
=========

Suspender's State
-----------------
- `suspendable`
    - `auto`: Green icon. the page will be suspended automatically.
    - `form_changed`: Yellow icon. the page will NOT be suspended automatically.
      Manual suspension is still possible
    - `tab_whitelist`: Yellow icon. the page will NOT be suspended automatically.
      Manual suspension is still possible
    - `url_whitelist`: Yellow icon. the page will NOT be suspended automatically.
      Manual suspension is still possible
- `nonsuspenable`
    - `system_page`: Red icon. system page cannot be suspended
    - `not_running`: Red icon. content script is not running. Suspension is not 
       possible
    - `error`: Red icon. unknown error: Suspension is not 
       possible
- `suspended`
    - `suspended`: Standard icon. the page is already suspended. Can be restored


IPC Commands (CORE)
-------------------
- `ts_suspend_tab`: suspend specified tab
- `ts_restore_tab`: restore specified tab
- `ts_suspend_current_tab`: suspend currently active tab
- `ts_restore_current_tab`: restore currently active tab
- `ts_suspend_all_tabs`: suspend all tabs
- `ts_suspend_other_tabs`: suspend all tabs except the specified tab
- `ts_restore_all_tabs`: restore all suspended tabs
- `ts_get_tab_state`: get state of specified tab. It will ask content script 
  for state, and then override the returned value if necessary


IPC Commands (Content Script)
-----------------------------
- `ts_suspend_tab`
- `ts_restore_tab`
- `ts_get_tab_state`: answer with `suspendable:auto` or `suspended:suspended`.
  May be overridden by CORE


