import{r as e}from"./rolldown-runtime-QTnfLwEv.js";import{Ft as t,ht as n,t as r}from"./vendor-BXfUUSDP.js";import{B as i,M as a,Z as o,_ as s,b as c,j as l,n as u,nn as d}from"./vendor-core-CJ5AMTKy.js";import{t as f}from"./formatRupiah-BPNt29Go.js";import{i as p,n as m,r as h,t as g}from"./AdminLayout-CaYZAaQs.js";import{n as _}from"./useAdminToast-CoX7-bC0.js";import{t as v}from"./AdminPageCard-aX1Wqrt_.js";import{t as y}from"./TransitionModal-Cp9O1hIF.js";import{a as b,i as x,n as S,r as C}from"./customerMetrics-Ctr0zG31.js";import{n as ee,t as te}from"./GpsCoordinateFields-Dr2Gmd1_.js";var w=e(t(),1),T=e(r(),1);function E(e){return e==null?``:String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function D(e,t=`neutral`){return`<span class="map-popup-badge map-popup-badge--${t}">${E(e)}</span>`}function O(e,t,n=``){return`
        <div class="map-popup-stat">
            <span class="map-popup-stat-label">${E(e)}</span>
            <span class="map-popup-stat-value ${n}">${t}</span>
        </div>
    `}function k(e,t,n){return`
        <section class="map-popup-card">
            <div class="map-popup-card-head">
                <span class="map-popup-card-icon">${t}</span>
                <span class="map-popup-card-title">${E(e)}</span>
            </div>
            ${n}
        </section>
    `}function A(e){return e===`active`?{label:`Aktif`,variant:`success`}:e===`isolated`?{label:`Isolir`,variant:`warning`}:e===`suspended`?{label:`Suspend`,variant:`danger`}:{label:`Nonaktif`,variant:`neutral`}}function j(e){return e===`good`?`map-popup-stat-value--good`:e===`warning`?`map-popup-stat-value--warn`:e===`critical`?`map-popup-stat-value--bad`:``}function M(e,t,n,r){let i=n>0?n*1e6:0,a=i>0?Math.min(100,(Number(t)||0)/i*100):0,o=Math.PI*36,s=a/100*o,c=(180-a/100*180)*Math.PI/180,l=50+26*Math.cos(c),u=48-26*Math.sin(c),d=r===`down`?`#059669`:`#2563eb`,f=r===`down`?`#34d399`:`#60a5fa`,p=n>0?`${n}M`:`N/A`,m=n>0?`${Math.round(n/2)}M`:``;return`
        <div class="map-speedometer map-speedometer--${r}">
            <div class="map-speedometer-shell">
                <svg viewBox="0 0 100 62" class="map-speedometer-svg" aria-hidden="true">
                    <defs>
                        <linearGradient id="gauge-grad-${r}" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stop-color="${d}" />
                            <stop offset="100%" stop-color="${f}" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M 14 48 A 36 36 0 0 1 86 48"
                        fill="none"
                        stroke="#e4e4e7"
                        stroke-width="6"
                        stroke-linecap="round"
                        opacity="0.9"
                    />
                    <path
                        d="M 14 48 A 36 36 0 0 1 86 48"
                        fill="none"
                        stroke="url(#gauge-grad-${r})"
                        stroke-width="6"
                        stroke-linecap="round"
                        stroke-dasharray="${s.toFixed(2)} ${o.toFixed(2)}"
                        class="map-speedometer-arc"
                    />
                    <line x1="50" y1="48" x2="${l.toFixed(2)}" y2="${u.toFixed(2)}" stroke="${d}" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
                    <circle cx="50" cy="48" r="3" fill="#fff" stroke="${d}" stroke-width="1.5"/>
                    <text x="8" y="58" font-size="5.5" fill="#94a3b8" font-weight="600">0</text>
                    <text x="46" y="11" font-size="5.5" fill="#94a3b8" font-weight="600">${m}</text>
                    <text x="82" y="58" font-size="5.5" fill="#94a3b8" font-weight="600">${p}</text>
                </svg>
            </div>
            <p class="map-speedometer-label">${e}</p>
            <p class="map-speedometer-value">${N(t)}</p>
        </div>
    `}function N(e){let t=Number(e)||0;return t>=1e6?`${(t/1e6).toFixed(1)} Mbps`:t>=1e3?`${Math.round(t/1e3)} Kbps`:`${Math.round(t)} bps`}function P(){let e=window.matchMedia(`(max-width: 639px)`).matches;return{maxWidth:e?292:400,minWidth:e?268:340,maxHeight:Math.min(Math.round(window.innerHeight*.48),380),autoPanPadding:e?[32,20]:[48,48],className:`customer-detail-popup`}}function F(e,t={},n={}){let{canWrite:r=!1}=n,i=C(t,e.username),a=x(t,e),o=t&&(Object.keys(t.ont||{}).length>0||(t.ont_devices||[]).length>0),s=e.package||{},c=S(s.bandwidth_limit),l=!!a.online,u=A(e.status),d=e.odp?.name||`-`,p=i.rx||(o?`Tidak tersedia`:`Memuat...`),m=i.status||`offline`,h=e=>e==null||e===``?`—`:E(e),g=E(String(e.name||`?`).charAt(0).toUpperCase()),_=E(String(e.service_type||`pppoe`).toUpperCase());return`
        <div class="map-popup-customer" data-customer-id="${e.id}">
            <header class="map-popup-hero">
                <div class="map-popup-hero-glow"></div>
                <div class="map-popup-hero-row">
                    <div class="map-popup-avatar">${g}</div>
                    <div class="map-popup-hero-text">
                        <h3 class="map-popup-name">${E(e.name)}</h3>
                        <p class="map-popup-sub">${E(e.username)} · ${_}</p>
                    </div>
                </div>
                <div class="map-popup-badges">
                    ${D(u.label,u.variant)}
                    ${D(l?`Online`:`Offline`,l?`online`:`offline`)}
                </div>
            </header>

            <div class="map-popup-body">
                ${k(`Paket & Tagihan`,`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7.6 12 12.8l8.7-5.2"/><path d="M12 22.8V12.7"/></svg>`,`
                    <div class="map-popup-stats-grid">
                        ${O(`Paket`,h(s.name))}
                        ${O(`Harga / bulan`,s.price?f(s.price):`—`,`map-popup-stat-value--accent`)}
                        ${O(`Bandwidth`,h(s.bandwidth_limit))}
                        ${O(`Titik ODP`,E(d))}
                    </div>
                `)}

                ${k(`ONT & Jaringan`,`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`,`
                    <div class="map-popup-stats-grid">
                        ${O(`Redaman`,E(p),j(m))}
                        ${O(`Suhu ONT`,h(i.temperature))}
                        ${O(`Perangkat WiFi`,i.connected_devices!==null&&i.connected_devices!==void 0?`${i.connected_devices} unit`:`—`)}
                        ${O(`Product Class`,h(i.product_class||i.model))}
                    </div>
                `)}

                ${k(`WiFi Pelanggan`,`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.5a14 14 0 0 1 14 0"/><path d="M8.5 15.5a9 9 0 0 1 7 0"/><path d="M12 19h.01"/><path d="M2 8.5a20 20 0 0 1 20 0"/></svg>`,`
                    <div class="map-popup-credential-grid">
                        <div class="map-popup-credential">
                            <span class="map-popup-stat-label">Nama WiFi</span>
                            <span class="map-popup-credential-value">${h(i.wifi_ssid)}</span>
                        </div>
                        <div class="map-popup-credential">
                            <span class="map-popup-stat-label">Sandi WiFi</span>
                            <span class="map-popup-credential-value">${h(i.wifi_password)}</span>
                        </div>
                    </div>
                    ${r?`
                        <button type="button" class="map-popup-wifi-edit-btn" data-customer-id="${e.id}" data-customer-username="${E(e.username)}" data-customer-name="${E(e.name)}">
                            Ubah WiFi
                        </button>
                    `:``}
                `)}

                ${k(`Traffic Langsung`,`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 5-6"/></svg>`,`
                    <div class="map-speedometer-grid">
                        ${M(`Download`,a.download_bps||0,c.down,`down`)}
                        ${M(`Upload`,a.upload_bps||0,c.up,`up`)}
                    </div>
                `)}

                <footer class="map-popup-footer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
                    <span>${E(e.address)}</span>
                </footer>
            </div>
        </div>
    `}var I=d(),ne=e=>e?.service_type!==`hotspot`;function L({odps:e=[],customers:t=[]}){let r=h(),{showToast:d}=_(),{canWrite:f}=p(),{isDarkMode:g,themeCard:x,themeTextTitle:S,themeTextSub:C,themeTextDesc:E}=r,D=g?`bg-zinc-950/40 border-zinc-900`:`bg-zinc-50 border-zinc-200/60`,O=g?`bg-zinc-900 border-zinc-800 text-white focus:border-zinc-700`:`bg-white border-zinc-200 text-zinc-800 focus:border-zinc-300`,k=g?`text-zinc-400`:`text-zinc-650`,[A,j]=(0,w.useState)(!1),[M,N]=(0,w.useState)(null),[L,R]=(0,w.useState)(``),[z,B]=(0,w.useState)(``),[V,H]=(0,w.useState)(``),[U,re]=(0,w.useState)({ont:{},traffic:{}}),[W,G]=(0,w.useState)(null),ie={canWrite:f},K=(0,w.useRef)(null),q=(0,w.useRef)({}),J=(0,w.useRef)(null),Y=(0,w.useRef)(U);Y.current=U;let X=(0,w.useRef)(f);X.current=f,(0,w.useEffect)(()=>{A&&(B(M?String(M.latitude):``),H(M?String(M.longitude):``))},[A,M]);let Z=async()=>{try{re(await(await fetch(`/admin/network-map/metrics`)).json())}catch(e){console.error(`Failed to load network map metrics`,e)}};(0,w.useEffect)(()=>{Z();let e=setInterval(Z,15e3);return()=>clearInterval(e)},[]),(0,w.useEffect)(()=>{let e=J.current;if(!e)return;let n=q.current[e],r=t.find(t=>t.id===e);n&&r&&n.isPopupOpen()&&n.setPopupContent(F(r,U,ie))},[U,t,f]);let ae=e=>{K.current&&e.latitude&&e.longitude&&K.current.flyTo([parseFloat(e.latitude),parseFloat(e.longitude)],17,{animate:!0,duration:1.2})},oe=e=>{e.preventDefault();let t=new FormData(e.target),r=Object.fromEntries(t.entries());n.post(`/admin/odps/save`,r,{onSuccess:()=>{j(!1),N(null)}})},se=e=>{confirm(`Apakah Anda yakin ingin menghapus ODP "${e.name}"? Tindakan ini tidak dapat dibatalkan.`)&&n.post(`/admin/odps/delete`,{id:e.id})},Q=e.filter(e=>e.name.toLowerCase().includes(L.toLowerCase())||e.description&&e.description.toLowerCase().includes(L.toLowerCase()));(0,w.useEffect)(()=>{if(!document.getElementById(`map-container`))return;let r=e.length>0?[parseFloat(e[0].latitude),parseFloat(e[0].longitude)]:[-6.3263,108.3201],i=T.default.map(`map-container`,{center:r,zoom:15,zoomControl:!1,layers:[]});K.current=i,T.default.control.zoom({position:`topright`}).addTo(i);let a=(e,t)=>`
                    <form id="mini-odp-form" class="p-2 space-y-3 w-56 font-sans text-zinc-800 leading-normal">
                        <div class="flex items-center gap-1.5 border-b border-zinc-100 pb-2">
                            <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span class="font-extrabold text-[11px] text-zinc-900 tracking-wider uppercase">Tambah ODP Baru</span>
                        </div>
                        
                        <div class="space-y-2">
                            <div class="flex flex-col gap-1">
                                <label class="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Nama ODP</label>
                                <input required id="mini-odp-name" type="text" placeholder="Contoh: ODP-IND-01" class="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-[10px] transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs" style="color:#27272a !important; background-color:#ffffff !important;" />
                            </div>
                            
                            <div class="grid grid-cols-2 gap-2">
                                <div class="flex flex-col gap-1">
                                    <label class="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Latitude</label>
                                    <input readonly id="mini-odp-lat" type="text" value="${e.toFixed(6)}" class="w-full px-2 py-1.5 border border-zinc-100 rounded-lg text-[9px] font-mono bg-zinc-50 text-zinc-450 focus:outline-none" style="color:#71717a !important; background-color:#f4f4f5 !important;" />
                                </div>
                                <div class="flex flex-col gap-1">
                                    <label class="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Longitude</label>
                                    <input readonly id="mini-odp-lng" type="text" value="${t.toFixed(6)}" class="w-full px-2 py-1.5 border border-zinc-100 rounded-lg text-[9px] font-mono bg-zinc-50 text-zinc-450 focus:outline-none" style="color:#71717a !important; background-color:#f4f4f5 !important;" />
                                </div>
                            </div>
                            
                            <div class="flex flex-col gap-1">
                                <label class="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Jumlah Port</label>
                                <input required id="mini-odp-ports" type="number" min="1" value="8" class="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-[10px] transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs" style="color:#27272a !important; background-color:#ffffff !important;" />
                            </div>
                            
                            <div class="flex flex-col gap-1">
                                <label class="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Deskripsi Lokasi</label>
                                <textarea id="mini-odp-desc" placeholder="Contoh: Depan warung..." class="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-[10px] h-12 resize-none transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs" style="color:#27272a !important; background-color:#ffffff !important;"></textarea>
                            </div>
                        </div>

                        <button type="button" id="mini-odp-gps-btn" class="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg font-bold text-[10px] transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
                            Ambil GPS Perangkat
                        </button>
                        
                        <button type="submit" class="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg font-bold text-[10px] transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-1">
                            Simpan ODP
                        </button>
                    </form>
                `,o=e=>{if(!X.current)return;let{lat:t,lng:n}=e;B(t.toFixed(6)),H(n.toFixed(6)),N(null),T.default.popup().setLatLng(e).setContent(a(t,n)).openOn(i)};i.on(`contextmenu`,e=>{T.default.DomEvent.preventDefault(e.originalEvent),o(e.latlng)});let s=i.getContainer(),c=null,l=null,u=()=>{c!==null&&(clearTimeout(c),c=null),l=null},f=e=>{if(e.touches.length!==1){u();return}let t=e.touches[0];l={x:t.clientX,y:t.clientY,touch:t},c=window.setTimeout(()=>{if(c=null,!l)return;let{touch:e}=l;o(i.containerPointToLatLng(i.mouseEventToContainerPoint({clientX:e.clientX,clientY:e.clientY}))),navigator.vibrate?.(40),l=null},600)},p=e=>{if(!l||c===null)return;let t=e.touches[0],n=t.clientX-l.x,r=t.clientY-l.y;Math.hypot(n,r)>12&&u()},m=()=>{u()};s.addEventListener(`touchstart`,f,{passive:!0}),s.addEventListener(`touchmove`,p,{passive:!0}),s.addEventListener(`touchend`,m),s.addEventListener(`touchcancel`,m),i.on(`popupopen`,e=>{let r=e.popup.getElement();if(!r)return;let a=r.querySelector(`.map-popup-wifi-edit-btn`);a&&!a.dataset.bound&&(a.dataset.bound=`1`,a.addEventListener(`click`,()=>{let e=Number(a.dataset.customerId),n=t.find(t=>t.id===e);n&&G(n)}));let o=r.querySelector(`#mini-odp-form`);if(o){setTimeout(()=>{let e=o.querySelector(`#mini-odp-name`);e&&e.focus()},100),o.addEventListener(`submit`,e=>{if(e.preventDefault(),!X.current)return;let t=o.querySelector(`#mini-odp-name`).value,r=o.querySelector(`#mini-odp-ports`).value,a=o.querySelector(`#mini-odp-desc`).value,s=o.querySelector(`#mini-odp-lat`).value,c=o.querySelector(`#mini-odp-lng`).value;n.post(`/admin/odps/save`,{name:t,latitude:s,longitude:c,total_ports:r,description:a},{onSuccess:()=>{i.closePopup()}})});let e=o.querySelector(`#mini-odp-gps-btn`);e&&e.addEventListener(`click`,async()=>{e.disabled=!0,e.textContent=`Membaca GPS...`;try{let e=await ee(),t=o.querySelector(`#mini-odp-lat`),n=o.querySelector(`#mini-odp-lng`);t&&(t.value=e.latitude),n&&(n.value=e.longitude),B(e.latitude),H(e.longitude),i.flyTo([parseFloat(e.latitude),parseFloat(e.longitude)],17,{duration:.8}),d(`Koordinat GPS berhasil diambil.`,`success`)}catch(e){d(e.message||`Gagal membaca GPS perangkat.`,`error`)}finally{e.disabled=!1,e.textContent=`Ambil GPS Perangkat`}})}});let h=g?`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`:`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`;T.default.tileLayer(h,{attribution:`© OpenStreetMap`}).addTo(i);let _=T.default.divIcon({className:`custom-odp-marker`,html:`<div class="w-6 h-6 rounded-full bg-blue-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center text-[8px] font-black text-white shadow-lg ring-2 ring-blue-500/25">ODP</div>`,iconSize:[24,24],iconAnchor:[12,12]}),v=e=>T.default.divIcon({className:`custom-customer-marker`,html:`<div class="w-3.5 h-3.5 rounded-full ${e===`active`?`bg-emerald-500 ring-emerald-500/35`:`bg-rose-500 ring-rose-500/35`} border border-white dark:border-zinc-950 shadow-md ring-2"></div>`,iconSize:[14,14],iconAnchor:[7,7]}),y={};e.forEach(e=>{let t=parseFloat(e.latitude),n=parseFloat(e.longitude);y[e.id]=[t,n],T.default.marker([t,n],{icon:_}).addTo(i).bindPopup(`
                    <div class="text-[11px] font-sans text-zinc-900 leading-normal p-0.5">
                        <p class="font-extrabold text-blue-600 uppercase tracking-wider">${e.name}</p>
                        <p class="text-zinc-500 font-semibold mt-0.5">${e.description||`No description`}</p>
                        <div class="flex items-center gap-1.5 mt-1 pt-1 border-t border-zinc-100 font-bold text-[10px]">
                            <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            <span>Port: ${e.customers_count??e.used_ports??0} / ${e.total_ports} Terpakai</span>
                        </div>
                    </div>
                `)}),q.current={},t.forEach(e=>{if(!ne(e)||!e.latitude||!e.longitude)return;let t=parseFloat(e.latitude),n=parseFloat(e.longitude),r=T.default.marker([t,n],{icon:v(e.status)}).addTo(i).bindPopup(()=>F(e,Y.current,{canWrite:X.current}),P());if(r.on(`popupopen`,()=>{J.current=e.id,r.setPopupContent(F(e,Y.current,{canWrite:X.current}))}),r.on(`popupclose`,()=>{J.current===e.id&&(J.current=null)}),q.current[e.id]=r,e.odp_id&&y[e.odp_id]){let r=y[e.odp_id],a=[t,n],o=e.status===`active`?`#10b981`:`#f59e0b`;T.default.polyline([r,a],{color:o,weight:2,opacity:.75,className:`optical-cable-flow`,smoothFactor:0}).addTo(i)}});let b=2400,x=performance.now(),S=null,C=e=>{let t=-((e-x)%b/b)*20;i.getPane(`overlayPane`)?.querySelectorAll(`path.optical-cable-flow`).forEach(e=>{e.style.strokeDashoffset=`${t}`}),S=requestAnimationFrame(C)};return S=requestAnimationFrame(C),()=>{S!==null&&cancelAnimationFrame(S),u(),s.removeEventListener(`touchstart`,f),s.removeEventListener(`touchmove`,p),s.removeEventListener(`touchend`,m),s.removeEventListener(`touchcancel`,m),K.current=null,i.remove()}},[e,t,g,d]);let $=()=>{j(!1),N(null)};return(0,I.jsxs)(I.Fragment,{children:[(0,I.jsx)(v,{icon:o,accent:`sky`,title:`Peta Jaringan Pelanggan & ODP`,description:`Teknologi Optical Distribution Point (ODP)`,themeCard:x,isDarkMode:g,themeTextTitle:S,themeTextDesc:E,children:(0,I.jsxs)(`div`,{className:`flex flex-col lg:flex-row gap-5`,children:[(0,I.jsxs)(`div`,{className:`w-full lg:w-80 xl:w-96 flex flex-col space-y-3 flex-shrink-0`,children:[(0,I.jsxs)(`div`,{className:`flex justify-between items-center`,children:[(0,I.jsxs)(`h3`,{className:`text-xs font-bold ${S}`,children:[`Daftar ODP (`,Q.length,`)`]}),f&&(0,I.jsx)(`button`,{type:`button`,onClick:()=>{N(null),j(!0)},title:`Tambah ODP`,className:`p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg cursor-pointer inline-flex items-center justify-center transition-colors`,children:(0,I.jsx)(i,{className:`w-4 h-4`})})]}),(0,I.jsxs)(`div`,{className:`relative`,children:[(0,I.jsx)(`input`,{type:`text`,placeholder:`Cari ODP...`,value:L,onChange:e=>R(e.target.value),className:`w-full p-2 pl-8 border rounded-lg text-xs ${O}`}),(0,I.jsx)(l,{className:`w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-3`})]}),(0,I.jsx)(`div`,{className:`max-h-[500px] overflow-y-auto space-y-2 pr-1`,children:Q.length===0?(0,I.jsx)(`div`,{className:`text-center py-8 text-xs ${C} ${D} rounded-xl border border-dashed`,children:`Tidak ada ODP ditemukan`}):Q.map(e=>{let n=e.customers_count??t.filter(t=>t.odp_id===e.id).length,r=n>=e.total_ports;return(0,I.jsxs)(`div`,{onClick:()=>ae(e),className:`p-3 rounded-xl border transition-all duration-150 cursor-pointer flex justify-between items-start gap-2 ${g?`bg-zinc-950/40 border-zinc-900 hover:bg-zinc-900/60 hover:border-zinc-800`:`bg-zinc-50/50 border-zinc-150 hover:bg-zinc-100/60 hover:border-zinc-200`}`,children:[(0,I.jsxs)(`div`,{className:`space-y-1 min-w-0 flex-1`,children:[(0,I.jsxs)(`div`,{className:`flex items-center gap-1.5`,children:[(0,I.jsx)(`div`,{className:`w-2 h-2 rounded-full ${r?`bg-rose-500`:`bg-blue-500`}`}),(0,I.jsx)(`span`,{className:`text-xs font-bold truncate ${S}`,children:e.name})]}),(0,I.jsx)(`p`,{className:`text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold truncate`,children:e.description||`Tidak ada deskripsi lokasi`}),(0,I.jsxs)(`div`,{className:`flex items-center gap-2 text-[10px] font-medium text-zinc-500 dark:text-zinc-450 mt-1`,children:[(0,I.jsxs)(`span`,{className:`px-1.5 py-0.5 rounded-md ${r?`bg-rose-500/10 text-rose-500 dark:text-rose-400`:`bg-blue-500/10 text-blue-600 dark:text-blue-400`}`,children:[`Port: `,n,` / `,e.total_ports]}),(0,I.jsxs)(`span`,{className:`font-mono text-[9px]`,children:[parseFloat(e.latitude).toFixed(5),`, `,parseFloat(e.longitude).toFixed(5)]})]})]}),(0,I.jsx)(`div`,{className:`flex items-center gap-1 flex-shrink-0`,onClick:e=>e.stopPropagation(),children:f?(0,I.jsxs)(I.Fragment,{children:[(0,I.jsx)(`button`,{type:`button`,onClick:()=>{N(e),j(!0)},className:`inline-block p-1 text-emerald-500 hover:text-emerald-400 cursor-pointer transition-colors`,title:`Edit ODP`,children:(0,I.jsx)(c,{className:`w-4 h-4`})}),(0,I.jsx)(`button`,{type:`button`,onClick:()=>se(e),className:`inline-block p-1 text-rose-500 hover:text-rose-400 cursor-pointer transition-colors`,title:`Hapus ODP`,children:(0,I.jsx)(s,{className:`w-4 h-4`})})]}):(0,I.jsx)(m,{})})]},e.id)})})]}),(0,I.jsxs)(`div`,{className:`flex-1 flex flex-col space-y-2`,children:[(0,I.jsxs)(`p`,{className:`text-xs text-zinc-500 dark:text-zinc-400`,children:[`Peta di bawah menggambarkan jalur kabel fiber optik dari masing-masing kotak ODP (biru) ke titik rumah pelanggan (hijau: aktif, merah: nonaktif).`,f&&(0,I.jsxs)(I.Fragment,{children:[` `,(0,I.jsx)(`span`,{className:`hidden sm:inline`,children:`Klik kanan`}),(0,I.jsx)(`span`,{className:`sm:hidden`,children:`Tahan`}),` pada peta untuk menambah ODP baru.`]})]}),(0,I.jsxs)(`div`,{className:`border rounded-2xl overflow-hidden shadow-xs relative ${g?`border-zinc-800/80`:`border-zinc-200`}`,children:[(0,I.jsx)(`div`,{id:`map-container`,className:`h-[550px] w-full z-0`}),(0,I.jsxs)(`div`,{className:`absolute bottom-2.5 right-2.5 z-[400] bg-zinc-950/85 border border-zinc-800/60 backdrop-blur-xs px-2.5 py-1.5 rounded-lg flex gap-3 text-[9px] font-bold text-zinc-400 shadow-md`,children:[(0,I.jsxs)(`div`,{className:`flex items-center gap-1`,children:[(0,I.jsx)(`span`,{className:`w-2.5 h-2.5 rounded-full bg-blue-500`}),` ODP`]}),(0,I.jsxs)(`div`,{className:`flex items-center gap-1`,children:[(0,I.jsx)(`span`,{className:`w-2.5 h-2.5 rounded-full bg-emerald-500`}),` Aktif`]}),(0,I.jsxs)(`div`,{className:`flex items-center gap-1`,children:[(0,I.jsx)(`span`,{className:`w-2.5 h-2.5 rounded-full bg-rose-500`}),` Nonaktif`]})]})]})]})]})}),(0,I.jsxs)(y,{show:A,onClose:$,themeCard:x,maxWidth:`md`,children:[(0,I.jsxs)(`div`,{className:`flex justify-between items-center pb-2 border-b ${g?`border-zinc-800/40`:`border-zinc-200/80`}`,children:[(0,I.jsx)(`h3`,{className:`text-sm font-bold ${S}`,children:M?`Edit Kotak ODP`:`Tambah Kotak ODP`}),(0,I.jsx)(`button`,{type:`button`,onClick:$,className:`text-zinc-500 hover:text-white transition-colors cursor-pointer`,children:(0,I.jsx)(u,{className:`w-4 h-4`})})]}),(0,I.jsxs)(`form`,{onSubmit:oe,className:`space-y-3 text-xs`,children:[(0,I.jsx)(`input`,{type:`hidden`,name:`id`,value:M?M.id:``}),(0,I.jsxs)(`div`,{className:`flex flex-col gap-1`,children:[(0,I.jsx)(`label`,{className:`font-bold ${k}`,children:`Nama ODP`}),(0,I.jsx)(`input`,{required:!0,name:`name`,type:`text`,placeholder:`Contoh: ODP-JBG-01`,defaultValue:M?M.name:``,className:`p-2 border rounded-lg ${O}`})]}),(0,I.jsx)(te,{latitude:z,longitude:V,onLatitudeChange:B,onLongitudeChange:H,themeInput:O,themeLabel:k,isDarkMode:g,required:!0,inputType:`number`,onError:e=>d(e,`error`),onSuccess:()=>d(`Koordinat GPS berhasil diambil.`,`success`)}),(0,I.jsxs)(`div`,{className:`flex flex-col gap-1`,children:[(0,I.jsx)(`label`,{className:`font-bold ${k}`,children:`Jumlah Port Total`}),(0,I.jsx)(`input`,{required:!0,name:`total_ports`,type:`number`,min:`1`,placeholder:`8`,defaultValue:M?M.total_ports:8,className:`p-2 border rounded-lg ${O}`})]}),(0,I.jsxs)(`div`,{className:`flex flex-col gap-1`,children:[(0,I.jsx)(`label`,{className:`font-bold ${k}`,children:`Deskripsi Lokasi / Keterangan`}),(0,I.jsx)(`textarea`,{name:`description`,placeholder:`Dekat tiang listrik depan toko A...`,defaultValue:M?M.description:``,className:`p-2 border rounded-lg h-20 resize-none ${O}`})]}),(0,I.jsxs)(`div`,{className:`p-2.5 ${D} rounded-xl text-[10px] ${C} leading-normal`,children:[`💡 `,(0,I.jsx)(`strong`,{className:S,children:`Tips:`}),` Klik kanan peta (desktop) atau tahan peta (HP) untuk tambah ODP, gunakan tombol GPS perangkat, atau isi koordinat manual.`]}),(0,I.jsxs)(`div`,{className:`flex justify-end pt-3 gap-2`,children:[(0,I.jsx)(`button`,{type:`button`,onClick:$,title:`Batal`,className:`p-2 border rounded-lg cursor-pointer inline-flex items-center justify-center transition-colors ${g?`border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900`:`border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900`}`,children:(0,I.jsx)(u,{className:`w-4 h-4`})}),(0,I.jsx)(`button`,{type:`submit`,title:`Simpan`,className:`p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg inline-flex items-center justify-center`,children:(0,I.jsx)(a,{className:`w-4 h-4`})})]})]})]}),(0,I.jsxs)(y,{show:!!W,onClose:()=>G(null),themeCard:x,maxWidth:`md`,children:[(0,I.jsxs)(`div`,{className:`flex justify-between items-center pb-2 border-b ${g?`border-zinc-800/40`:`border-zinc-200/80`}`,children:[(0,I.jsxs)(`div`,{children:[(0,I.jsx)(`h3`,{className:`text-sm font-bold ${S}`,children:`Ubah WiFi ONT`}),W&&(0,I.jsxs)(`p`,{className:`text-[10px] mt-0.5 ${E}`,children:[W.name,` · `,W.username]})]}),(0,I.jsx)(`button`,{type:`button`,onClick:()=>G(null),className:`text-zinc-500 hover:text-white transition-colors cursor-pointer`,children:(0,I.jsx)(u,{className:`w-4 h-4`})})]}),W&&(0,I.jsx)(`div`,{className:`pt-3`,children:(0,I.jsx)(b,{apiBase:`/admin/gpon`,customerId:W.id,username:W.username,canWrite:f,showReboot:!0,compact:!0,theme:r,onUpdated:()=>{Z()}})})]})]})}function R({odps:e,customers:t}){return(0,I.jsx)(g,{title:`Peta Jaringan`,children:(0,I.jsx)(L,{odps:e,customers:t})})}export{R as default};