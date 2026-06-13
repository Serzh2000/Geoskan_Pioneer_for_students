import{E as e,F as t,I as n,T as r,j as i,k as a,m as o,p as s,r as c,yn as l,z as u}from"./simulation-controls-CErsatck.js";import{a as d,c as f,d as p,f as m,h,i as g,l as _,m as v,o as y,p as b,s as x,u as S}from"./index-CCQREnlm.js";import{t as C}from"./context-BYWlk65s.js";S.defineTheme(`pioneer-light-blockly`,{name:`pioneer-light-blockly`,base:p.Classic,componentStyles:{workspaceBackgroundColour:`transparent`,toolboxBackgroundColour:`#ffffff`,toolboxForegroundColour:`#1a1a1a`,flyoutBackgroundColour:`#f8f9fa`,flyoutForegroundColour:`#1a1a1a`,scrollbarColour:`#cbd5df`,insertionMarkerColour:`#ff6b00`,insertionMarkerOpacity:.28,markerColour:`#ff6b00`,cursorColour:`#ff6b00`}});function w(e,t){let n=document.getElementById(`blockly-generated-code`);n&&(n.textContent=x(e,t)||`-- Пусто --`)}function T(){return`
        <div class="guide-check-status guide-check-status--info">
            Цепочка изменилась. Запустите проверку еще раз, чтобы обновить учебный статус решения.
        </div>
    `}function E(){return`<div class="guide-empty-state">После изменений предыдущий результат скрыт. Когда закончите правки, снова нажмите «Проверить решение».</div>`}function D(e,t){let r=e.length>0;return n(`launch_gate_evaluated`,{sequenceLength:e.length,diagnostics:t.map(e=>e.kind),launchAllowed:r,reason:r?`workspace_has_blocks`:`workspace_is_empty`},r?`info`:`warn`),r}function O(e,i,a,o,s){if(!o)return;let f=x(e,o);n(`launch_requested`,{language:e,lessonId:i.id,bannerKind:s.kind,codeLength:f.length,code:f},s.kind===`warning`?`warn`:`info`);let p=document.getElementById(`script-language-select`);l(e),p&&(p.value=e),g(e),d(f),u(e),r(e,i.id,s),t(!0),a(e),c(),n(`launch_started`,{language:e,lessonId:i.id,bannerKind:s.kind},s.kind===`warning`?`warn`:`success`)}var k={"lua-led-single":[`lua_ledbar_new`,`lua_led_set`,`lua_print`,`lua_timer_calllater`,`lua_callback_open`,`lua_callback_end`],"lua-led-sequence":[`lua_ledbar_new`,`lua_led_set`,`lua_timer_calllater`,`lua_print`,`lua_callback_open`,`lua_callback_end`],"lua-led-confirm":[`lua_ledbar_new`,`lua_led_set`,`lua_print`,`lua_timer_calllater`,`lua_callback_open`,`lua_callback_end`],"lua-led-delayed":[`lua_ledbar_new`,`lua_led_set`,`lua_timer_calllater`,`lua_print`,`lua_callback_open`,`lua_callback_end`],"lua-preflight":[`lua_ap_push`,`lua_event_callback`,`lua_print`,`lua_callback_open`,`lua_callback_end`],"lua-takeoff":[`lua_ap_push`,`lua_event_callback`,`lua_goto_local_point`,`lua_print`,`lua_callback_open`,`lua_callback_end`],"lua-route":[`lua_ap_push`,`lua_event_callback`,`lua_goto_local_point`,`lua_print`,`lua_callback_open`,`lua_callback_end`],"lua-point-confirm":[`lua_ap_push`,`lua_event_callback`,`lua_goto_local_point`,`lua_print`,`lua_callback_open`,`lua_callback_end`],"lua-mission":[`lua_ap_push`,`lua_event_callback`,`lua_goto_local_point`,`lua_print`,`lua_callback_open`,`lua_callback_end`],"lua-landing":[`lua_ap_push`,`lua_event_callback`,`lua_goto_local_point`,`lua_print`,`lua_callback_open`,`lua_callback_end`],"py-led-single":[`py_led_control`,`py_time_sleep`,`py_print`,`py_takeoff`],"py-led-sequence":[`py_led_control`,`py_time_sleep`,`py_print`,`py_takeoff`],"py-led-confirm":[`py_led_control`,`py_time_sleep`,`py_print`],"py-led-delayed":[`py_led_control`,`py_time_sleep`,`py_print`],"py-arm":[`py_arm`,`py_print`,`py_takeoff`,`py_land`],"py-takeoff":[`py_arm`,`py_time_sleep`,`py_takeoff`,`py_goto_local_point`],"py-route":[`py_arm`,`py_time_sleep`,`py_takeoff`,`py_goto_local_point`],"py-point-wait":[`py_arm`,`py_time_sleep`,`py_takeoff`,`py_goto_local_point`,`py_wait_point_reached`,`py_print`],"py-mission":[`py_arm`,`py_time_sleep`,`py_takeoff`,`py_goto_local_point`,`py_wait_point_reached`,`py_land`,`py_led_control`],"py-land":[`py_arm`,`py_time_sleep`,`py_takeoff`,`py_goto_local_point`,`py_wait_point_reached`,`py_land`]};function A(){return[{name:`Подготовка`,colour:`#0ea5e9`,blockTypes:[`lua_ledbar_new`,`lua_ap_push`,`lua_callback_open`,`lua_callback_end`]},{name:`Индикация и лог`,colour:`#22c55e`,blockTypes:[`lua_led_set`,`lua_print`]},{name:`Время и события`,colour:`#f59e0b`,blockTypes:[`lua_timer_calllater`,`lua_event_callback`]},{name:`Полет`,colour:`#a855f7`,blockTypes:[`lua_goto_local_point`]}]}function j(){return[{name:`Подготовка`,colour:`#0ea5e9`,blockTypes:[`py_arm`,`py_takeoff`,`py_land`]},{name:`Индикация и лог`,colour:`#22c55e`,blockTypes:[`py_led_control`,`py_print`]},{name:`Паузы и ожидание`,colour:`#f59e0b`,blockTypes:[`py_time_sleep`,`py_wait_point_reached`]},{name:`Маршрут`,colour:`#a855f7`,blockTypes:[`py_goto_local_point`]}]}function M(e,t){let n=(e===`python`?j():A()).flatMap(e=>e.blockTypes),r=new Set(k[t]||n);return`
        <xml xmlns="https://developers.google.com/blockly/xml">
            ${(e===`python`?j():A()).map(e=>({...e,blockTypes:e.blockTypes.filter(e=>r.has(e))})).filter(e=>e.blockTypes.length>0).map(e=>`
                <category name="${e.name}" colour="${e.colour}">
                    ${e.blockTypes.map(e=>`<block type="${e}"></block>`).join(``)}
                </category>
            `).join(``)}
        </xml>
    `}function N(e,t){if(e===`lua-led-sequence`)return`
            <xml>
                <block type="lua_ledbar_new">
                    <field name="COUNT">29</field>
                    <next>
                        <block type="lua_timer_calllater">
                            <field name="DELAY">1</field>
                            <statement name="CALLBACK">
                                <block type="lua_led_set">
                                    <field name="INDEX">0</field>
                                    <field name="R">0</field>
                                    <field name="G">0</field>
                                    <field name="B">1</field>
                                </block>
                            </statement>
                            <next>
                                <block type="lua_timer_calllater">
                                    <field name="DELAY">2</field>
                                    <statement name="CALLBACK">
                                        <block type="lua_led_set">
                                            <field name="INDEX">0</field>
                                            <field name="R">0</field>
                                            <field name="G">1</field>
                                            <field name="B">0</field>
                                        </block>
                                    </statement>
                                    <next>
                                        <block type="lua_timer_calllater">
                                            <field name="DELAY">3</field>
                                            <statement name="CALLBACK">
                                                <block type="lua_led_set">
                                                    <field name="INDEX">0</field>
                                                    <field name="R">1</field>
                                                    <field name="G">0</field>
                                                    <field name="B">0</field>
                                                </block>
                                            </statement>
                                        </block>
                                    </next>
                                </block>
                            </next>
                        </block>
                    </next>
                </block>
            </xml>
        `;let n=``;for(let e=t.length-1;e>=0;--e){let r=t[e];n=n===``?`<block type="${r}"></block>`:`<block type="${r}"><next>${n}</next></block>`}return`<xml>${n}</xml>`}var P=null,F=!1,I=null,L=0,R=null,z=!1;function B(){return document.documentElement.dataset.theme===`dark`?`dark`:`light`}var V=S.defineTheme(`pioneer-light-blockly`,{name:`pioneer-light-blockly`,base:p.Classic,componentStyles:{workspaceBackgroundColour:`transparent`,toolboxBackgroundColour:`#ffffff`,toolboxForegroundColour:`#1a1a1a`,flyoutBackgroundColour:`#f8f9fa`,flyoutForegroundColour:`#1a1a1a`,scrollbarColour:`#cbd5df`,insertionMarkerColour:`#ff6b00`,insertionMarkerOpacity:.28,markerColour:`#ff6b00`,cursorColour:`#ff6b00`}}),H=S.defineTheme(`pioneer-dark-blockly`,{name:`pioneer-dark-blockly`,base:p.Classic,componentStyles:{workspaceBackgroundColour:`transparent`,toolboxBackgroundColour:`#0f172a`,toolboxForegroundColour:`#e2e8f0`,flyoutBackgroundColour:`#111827`,flyoutForegroundColour:`#e2e8f0`,scrollbarColour:`#475569`,insertionMarkerColour:`#ff6b00`,insertionMarkerOpacity:.34,markerColour:`#ff9a4d`,cursorColour:`#ff9a4d`}});function U(){return B()===`dark`?H:V}function W(){return B()===`dark`?`#334155`:`#d7dde5`}function G(e=P){if(!e)return;e.setTheme(U());let t=W();document.querySelectorAll(`#blocklyDiv pattern[id^="blocklyGridPattern"] line`).forEach(e=>e.setAttribute(`stroke`,t)),v(e)}function K(){z||typeof window>`u`||(window.addEventListener(`app-theme-change`,()=>{G()}),z=!0)}function q(e,t){return e.length===t.length?e.some((e,n)=>e!==t[n]):!0}function J(e){return e?e.isUiEvent?!1:e.type!==_.FINISHED_LOADING:!0}function Y(){if(R&&(window.removeEventListener(`resize`,R),R=null),P){try{P.dispose()}catch(e){console.warn(`Failed to dispose workspace`,e)}P=null}}function X(e,t){let r=o(e.language,e.lesson.id),i=s(e.language,e.lesson.id);if(r)try{m.domToWorkspace(h.xml.textToDom(r),t)}catch{}else if(i.length>0){let n=N(e.lesson.id,i);try{m.domToWorkspace(h.xml.textToDom(n),t)}catch{}}n(`workspace_ready`,{...C(e),restoredFromXml:!!r,restoredFromSequence:!r&&i.length>0,sequenceLength:i.length})}function Z(t,c){c.addChangeListener(l=>{if(!J(l))return;w(t.language,c);let u=f(c),d=m.domToText(m.workspaceToDom(c)),p=s(t.language,t.lesson.id),h=o(t.language,t.lesson.id),g=q(p,u)||h!==d;if(a(t.language,t.lesson.id,u),i(t.language,t.lesson.id,d),!g)return;n(`workspace_changed`,{...C(t),eventType:l.type,sequenceLength:u.length,sequence:u,xmlLength:d.length}),e(t.language,t.lesson.id,!1),r(t.language,t.lesson.id,null);let _=document.getElementById(`guide-check-summary`);_&&(_.innerHTML=T());let v=document.getElementById(`diagnostics-container`);v&&(v.innerHTML=E()),t.container.querySelectorAll(`[data-guide-toggle-solution]`).forEach(e=>{e.disabled=!0})})}function Q(e,t){let n=M(e.language,e.lesson.id),r=++L;I=window.setTimeout(()=>{if(I=null,r!==L)return;let i=document.getElementById(`blocklyDiv`);if(!(i instanceof HTMLElement)||!i.isConnected)return;Y();let a=b(t,{toolbox:n,scrollbars:!0,trashcan:!0,theme:U(),toolboxPosition:`start`,grid:{spacing:24,length:1,colour:W(),snap:!1}});P=a,K(),R=()=>v(a),window.addEventListener(`resize`,R,!1),v(a),X(e,a),w(e.language,a),Z(e,a)},10)}function $(e){F||(y(),F=!0),I!==null&&(window.clearTimeout(I),I=null);let t=document.getElementById(`blocklyDiv`);if(!(t instanceof HTMLElement)){L+=1,Y();return}Q(e,t)}function ee(){return P}function te(){P&&P.clear()}function ne(e){if(P){P.clear();try{m.domToWorkspace(h.xml.textToDom(e),P)}catch(e){console.error(`Failed to load target workspace`,e)}}}export{$ as attachGuideWorkspace,te as clearGuideWorkspace,ne as fillGuideWorkspace,ee as getGuideWorkspace,D as n,O as r,N as t};