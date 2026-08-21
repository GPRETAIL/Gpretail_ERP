import{a as e,n as t,t as n}from"./jsx-runtime-KJkY8l8U.js";import{l as r}from"./chunk-KS7C4IRE-D0ZtfwCk.js";import{i}from"./react-redux-ofvQqo6q.js";import{t as a}from"./axios-DctJJlF9.js";import{t as o}from"./FilterableDataTable-gwa-xjA0.js";import{n as s}from"./dist-BJm-ZY9X.js";import{t as c}from"./arrow-left-anTmZ75Q.js";import{t as l}from"./save-CbJbJR63.js";import{t as u}from"./search-fiHeJfw5.js";import{c as d}from"./index-CPYGHgCP.js";var f=e(t(),1),p=n(),m=[2e3,500,200,100,50,20,10,5,2,1],h=(e,t=0)=>{let n=Number.parseInt(e,10);return Number.isInteger(n)?n:t},g=(e,t=0)=>{let n=Number.parseFloat(e);return Number.isFinite(n)?n:t},_=e=>`count_${e}`,v=e=>`₹${Number(e||0).toLocaleString(`en-IN`,{minimumFractionDigits:2,maximumFractionDigits:2})}`,y=e=>{let t=String(e?.name||``).trim()||`Unnamed`,n=String(e?.employee_code||``).trim();return n?`${t} (${n})`:t},b=e=>String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`),x=()=>m.reduce((e,t)=>(e[_(t)]=`0`,e),{}),S=()=>{let e=r(),t=i(e=>e.auth.user),[n,S]=(0,f.useState)(new Date),[C,w]=(0,f.useState)(!1),[T,E]=(0,f.useState)(!0),[D,O]=(0,f.useState)(!1),[k,A]=(0,f.useState)(!1),[j,M]=(0,f.useState)(!1),[N,P]=(0,f.useState)({counters:[],receivedByEmployees:[],cashiers:[]}),[F,I]=(0,f.useState)(1),[L,R]=(0,f.useState)(0),[z,B]=(0,f.useState)({counterId:``,receivedByEmployeeId:``,cashierEmployeeId:``,counterExpenses:`0`,notes:``,...x()}),[V,H]=(0,f.useState)({search:``,billNo:``,date:``,counterId:``,receivedByEmployeeId:``,cashierEmployeeId:``}),[U,ee]=(0,f.useState)([]),[te,W]=(0,f.useState)(1),[G,ne]=(0,f.useState)(10),K=(0,f.useRef)(V);(0,f.useEffect)(()=>{let e=setInterval(()=>S(new Date),1e3);return()=>clearInterval(e)},[]);let re=async()=>{E(!0);try{let e=(await a.get(`/cash-closings/meta`)).data?.data||{},t=(e,t=e=>e.name)=>(e||[]).map(e=>({value:String(e.id),label:t(e)}));P({counters:t(e.counters),receivedByEmployees:t(e.receivedByEmployees,y),cashiers:t(e.cashiers,y)})}catch(e){s.error(e?.response?.data?.message||`Failed to load cash closing options`),P({counters:[],receivedByEmployees:[],cashiers:[]})}finally{E(!1)}},q=async()=>{try{let e=await a.get(`/cash-closings/next-bill-no`);I(h(e.data?.data?.billNo,1))}catch{I(1)}},J=async e=>{if(!e){R(0);return}O(!0);try{let t=await a.get(`/cash-closings/opening-amount`,{params:{counterId:e}});R(g(t.data?.data?.openingAmount,0))}catch{R(0)}finally{O(!1)}};(0,f.useEffect)(()=>{re(),q()},[]),(0,f.useEffect)(()=>{J(z.counterId)},[z.counterId]),(0,f.useEffect)(()=>{K.current=V},[V]);let Y=(0,f.useMemo)(()=>m.reduce((e,t)=>{let n=_(t);return e+Math.max(0,h(z[n],0))*t},0),[z]),X=(0,f.useMemo)(()=>Y-L,[Y,L]),ie=(0,f.useMemo)(()=>N.counters.find(e=>e.value===z.counterId)||null,[N.counters,z.counterId]),ae=(0,f.useMemo)(()=>N.receivedByEmployees.find(e=>e.value===z.receivedByEmployeeId)||null,[N.receivedByEmployees,z.receivedByEmployeeId]),oe=(0,f.useMemo)(()=>N.cashiers.find(e=>e.value===z.cashierEmployeeId)||null,[N.cashiers,z.cashierEmployeeId]),Z=(0,f.useCallback)(async(e=null)=>{let t=e||K.current;M(!0);try{let e={};String(t.search||``).trim()&&(e.search=String(t.search).trim()),String(t.billNo||``).trim()&&(e.billNo=String(t.billNo).trim()),String(t.date||``).trim()&&(e.date=t.date),String(t.counterId||``).trim()&&(e.counterId=t.counterId),String(t.receivedByEmployeeId||``).trim()&&(e.receivedByEmployeeId=t.receivedByEmployeeId),String(t.cashierEmployeeId||``).trim()&&(e.cashierEmployeeId=t.cashierEmployeeId);let n=await a.get(`/cash-closings`,{params:e});ee(n.data?.data||[]),W(1)}catch{s.error(`Failed to search cash closings`)}finally{M(!1)}},[]),se=async()=>{w(!0),W(1);let e={search:``,billNo:``,date:``,counterId:``,receivedByEmployeeId:``,cashierEmployeeId:``};H(e),await Z(e)},ce=(0,f.useCallback)(({query:e})=>{W(1),H(t=>{let n={...t,search:e};return Z(n),n})},[Z]),le=(e,t)=>{if(t===``){B(t=>({...t,[e]:``}));return}let n=h(t,0);n<0||B(t=>({...t,[e]:String(n)}))},ue=async()=>{if(!z.counterId){s.error(`Counter is required`);return}if(!z.receivedByEmployeeId){s.error(`Received By is required`);return}if(!z.cashierEmployeeId){s.error(`Cashier is required`);return}let e={counterId:z.counterId,receivedByEmployeeId:z.receivedByEmployeeId,cashierEmployeeId:z.cashierEmployeeId,counterExpenses:g(z.counterExpenses,0),notes:String(z.notes||``).trim(),...m.reduce((e,t)=>{let n=_(t);return e[n]=Math.max(0,h(z[n],0)),e},{})};A(!0);try{let t=(await a.post(`/cash-closings`,e)).data?.data?.bill_no;s.success(`Cash closing saved successfully (Bill #${t})`),B(e=>({...e,counterExpenses:`0`,notes:``,...x()})),await Promise.all([q(),J(z.counterId)])}catch(e){s.error(e?.response?.data?.message||`Failed to save cash closing`)}finally{A(!1)}},de=async()=>{if(C)return;if(!z.counterId){s.error(`Counter is required before printing`);return}let e=m.map(e=>{let t=Math.max(0,h(z[_(e)],0));return{denomination:e,count:t,amount:t*e}}).filter(e=>e.count>0),r=e.length>0?e:m.map(e=>({denomination:e,count:0,amount:0})),i=String(t?.role||``).toLowerCase(),o=String(t?.name||``).trim();if(i===`user`&&t?.company_id)try{let e=await a.get(`/companies/${t.company_id}`),n=String(e.data?.data?.admin_user?.name||``).trim();n&&(o=n)}catch{}o||=String(t?.name||t?.email||`Cash Closing`).trim()||`Cash Closing`;let c=n.toLocaleString(),l=ie?.label||`-`,u=ae?.label||`-`,d=oe?.label||`-`,f=String(z.notes||``).trim(),p=`
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Cash Closing ${F}</title>
          <style>
            body {
              font-family: "Courier New", monospace;
              width: 72mm;
              margin: 0;
              padding: 8px;
              color: #111;
              font-size: 12px;
              line-height: 1.35;
            }
            .title {
              text-align: left;
              font-weight: 700;
              font-size: 15px;
            }
            .subtitle {
              font-size: 12px;
              font-weight: 700;
              margin-bottom: 6px;
            }
            .line {
              border-top: 1px dashed #555;
              margin: 6px 0;
            }
            .row {
              display: flex;
              justify-content: space-between;
              gap: 8px;
            }
            .row span:last-child {
              text-align: right;
              white-space: nowrap;
            }
            .section-title {
              font-weight: 700;
              margin-bottom: 2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 1px 0;
              font-size: 12px;
            }
            th {
              text-align: left;
              font-weight: 700;
            }
            td:last-child, th:last-child {
              text-align: right;
            }
            .notes {
              white-space: pre-wrap;
              word-break: break-word;
            }
          </style>
        </head>
        <body>
          <div class="title">${b(o)}</div>
          <div class="subtitle">Cash Over Statement</div>
          <div class="line"></div>

          <div class="row"><span>Date</span><span>${b(c)}</span></div>
          <div class="row"><span>Counter</span><span>${b(l)}</span></div>
          <div class="row"><span>Received By</span><span>${b(u)}</span></div>
          <div class="row"><span>Cashier</span><span>${b(d)}</span></div>
          <div class="row"><span>Bill No</span><span>${b(F)}</span></div>

          <div class="line"></div>
          <div class="section-title">Amount</div>
          <div class="row"><span>Opening Cash</span><span>${b(v(L))}</span></div>
          <div class="row"><span>Closing Cash</span><span>${b(v(Y))}</span></div>
          <div class="row"><span>Counter Expenses</span><span>${b(v(g(z.counterExpenses,0)))}</span></div>
          <div class="row"><span>Difference</span><span>${b(v(X))}</span></div>

          <div class="line"></div>
          <div class="section-title">Cash Denomination</div>
          <table>
            <thead>
              <tr>
                <th>Rs</th>
                <th>Nos</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${r.map(e=>`
                <tr>
                  <td>${b(e.denomination.toLocaleString(`en-IN`))}</td>
                  <td>${b(e.count)}</td>
                  <td>${b(v(e.amount))}</td>
                </tr>
              `).join(``)}
            </tbody>
          </table>

          <div class="line"></div>
          <div class="row"><span>Total Denomination</span><span>${b(v(Y))}</span></div>
          <div class="row"><span>Opening Cash</span><span>${b(v(L))}</span></div>
          <div class="row"><span>Cash [Tender]</span><span>${b(v(Y))}</span></div>
          <div class="row"><span>Counter Expenses</span><span>${b(v(g(z.counterExpenses,0)))}</span></div>
          <div class="row"><span>Discrepancy</span><span>${b(v(X))}</span></div>

          ${f?`
            <div class="line"></div>
            <div class="section-title">Notes</div>
            <div class="notes">${b(f)}</div>
          `:``}
        </body>
      </html>
    `,y=document.createElement(`iframe`);y.style.position=`fixed`,y.style.right=`0`,y.style.bottom=`0`,y.style.width=`0`,y.style.height=`0`,y.style.border=`0`,y.setAttribute(`aria-hidden`,`true`);let x=()=>{window.setTimeout(()=>{y.remove()},1e3)};y.onload=()=>{let e=y.contentWindow;if(!e){x(),s.error(`Failed to open print dialog.`);return}e.focus(),e.print(),x()},document.body.appendChild(y);let S=y.contentDocument||y.contentWindow?.document;if(!S){x(),s.error(`Failed to prepare print document.`);return}S.open(),S.write(p),S.close()},Q=(e,t,n,r,i,a=!1)=>(0,p.jsxs)(`select`,{name:t,value:n,onChange:i,className:`w-full border border-gray-300 dark:border-gray-600 rounded-sm p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`,children:[(0,p.jsx)(`option`,{value:``,children:a?`All`:`Select ${e}`}),r.map(e=>(0,p.jsx)(`option`,{value:e.value,children:e.label},e.value))]}),fe=(0,f.useMemo)(()=>[{key:`bill_no`,label:`Bill No`,valueGetter:e=>e.bill_no||`-`},{key:`closing_at`,label:`Date / Time`,valueGetter:e=>e.closing_at||``,render:e=>e?new Date(e).toLocaleString():`-`,searchValue:e=>e.closing_at?new Date(e.closing_at).toLocaleString():``},{key:`counter`,label:`Counter`,valueGetter:e=>e.counter?.name||`-`},{key:`received_by`,label:`Received By`,valueGetter:e=>y(e.receivedBy)},{key:`cashier`,label:`Cashier`,valueGetter:e=>y(e.cashier)},{key:`opening_amount`,label:`Opening`,valueGetter:e=>Number(e.opening_amount||0),render:e=>(0,p.jsx)(`div`,{className:`text-right`,children:v(e||0)})},{key:`closing_amount`,label:`Closing`,valueGetter:e=>Number(e.closing_amount||0),render:e=>(0,p.jsx)(`div`,{className:`text-right`,children:v(e||0)})},{key:`difference`,label:`Difference`,valueGetter:e=>Number(e.difference||0),render:e=>(0,p.jsx)(`div`,{className:`text-right`,children:v(e||0)})},{key:`counter_expenses`,label:`Expenses`,valueGetter:e=>Number(e.counter_expenses||0),render:e=>(0,p.jsx)(`div`,{className:`text-right`,children:v(e||0)})},{key:`notes`,label:`Notes`,valueGetter:e=>e.notes||`-`}],[]),$=(0,f.useMemo)(()=>{let e=U.length;return{total:e,totalPages:Math.max(Math.ceil(e/Math.max(G,1)),1)}},[U.length,G]);return(0,p.jsxs)(`div`,{className:`min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100`,children:[(0,p.jsxs)(`div`,{className:`flex justify-between items-center px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm`,children:[(0,p.jsxs)(`div`,{className:`flex items-center space-x-2`,children:[(0,p.jsx)(`button`,{onClick:C?()=>w(!1):()=>e(`/sales`),className:`text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200`,"aria-label":C?`Back to cash closing entry`:`Back to sales`,children:(0,p.jsx)(c,{className:`w-4 h-4`})}),(0,p.jsxs)(`h1`,{className:`text-sm font-semibold flex items-center gap-1`,children:[(0,p.jsx)(`button`,{type:`button`,onClick:()=>e(`/sales`),className:`text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline`,children:`Sales`}),(0,p.jsx)(`span`,{className:`text-gray-500 dark:text-gray-400`,children:`/`}),(0,p.jsx)(`span`,{children:`Cash Closing`})]})]}),(0,p.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,p.jsxs)(`button`,{onClick:de,disabled:k||C||T,className:`glass-btn glass-btn-primary inline-flex items-center disabled:opacity-50`,children:[(0,p.jsx)(d,{className:`w-4 h-4 mr-1`}),`Print`]}),(0,p.jsxs)(`button`,{onClick:ue,disabled:k||C||T,className:`glass-btn glass-btn-success inline-flex items-center disabled:opacity-50`,children:[(0,p.jsx)(l,{className:`w-4 h-4 mr-1`}),k?`Saving...`:`Save`]}),(0,p.jsxs)(`button`,{onClick:C?()=>w(!1):se,className:`glass-btn glass-btn-primary inline-flex items-center`,children:[(0,p.jsx)(u,{className:`w-4 h-4 mr-1`}),C?`Back`:`Search`]})]})]}),(0,p.jsxs)(`div`,{className:`p-4 space-y-4 pb-28`,children:[C?(0,p.jsx)(`div`,{className:`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 space-y-4`,children:(0,p.jsx)(o,{rows:U,columns:fe,loading:j,loadingText:`Searching...`,emptyText:`No cash closing records found`,searchPlaceholder:`Search in cash closing fields...`,showExport:!1,enableColumnResize:!0,tablePreferenceKey:`sales.cash_closing.search`,onRefresh:Z,refreshDisabled:j,enableServerSearch:!0,onServerSearch:ce,page:te,limit:G,totalPages:$.totalPages,totalRows:$.total,onPageChange:W,onLimitChange:e=>{ne(e),W(1)},paginationMode:`client`})}):(0,p.jsx)(`div`,{className:`space-y-4`,children:(0,p.jsxs)(`div`,{className:`grid grid-cols-1 xl:grid-cols-2 gap-4`,children:[(0,p.jsxs)(`div`,{className:`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4`,children:[(0,p.jsx)(`h2`,{className:`text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3`,children:`Cash Closing Details`}),(0,p.jsxs)(`div`,{className:`space-y-3 max-w-xl`,children:[(0,p.jsxs)(`div`,{className:`flex items-center`,children:[(0,p.jsx)(`label`,{className:`w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300`,children:`Date / Time`}),(0,p.jsx)(`input`,{type:`text`,value:n.toLocaleString(),disabled:!0,readOnly:!0,className:`flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 ml-2`})]}),(0,p.jsxs)(`div`,{className:`flex items-center`,children:[(0,p.jsx)(`label`,{className:`w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300`,children:`Counter`}),(0,p.jsx)(`div`,{className:`flex-1 ml-2`,children:Q(`Counter`,`counterId`,z.counterId,N.counters,e=>B(t=>({...t,counterId:e.target.value})))})]}),(0,p.jsxs)(`div`,{className:`flex items-center`,children:[(0,p.jsx)(`label`,{className:`w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300`,children:`Received By`}),(0,p.jsx)(`div`,{className:`flex-1 ml-2`,children:Q(`Received By`,`receivedByEmployeeId`,z.receivedByEmployeeId,N.receivedByEmployees,e=>B(t=>({...t,receivedByEmployeeId:e.target.value})))})]}),(0,p.jsxs)(`div`,{className:`flex items-center`,children:[(0,p.jsx)(`label`,{className:`w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300`,children:`Cashier`}),(0,p.jsx)(`div`,{className:`flex-1 ml-2`,children:Q(`Cashier`,`cashierEmployeeId`,z.cashierEmployeeId,N.cashiers,e=>B(t=>({...t,cashierEmployeeId:e.target.value})))})]}),(0,p.jsxs)(`div`,{className:`flex items-center`,children:[(0,p.jsx)(`label`,{className:`w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300`,children:`Opening`}),(0,p.jsx)(`input`,{type:`text`,value:D?`Loading...`:v(L),disabled:!0,readOnly:!0,className:`flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 ml-2 font-semibold`})]}),(0,p.jsxs)(`div`,{className:`flex items-center`,children:[(0,p.jsx)(`label`,{className:`w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300`,children:`Closing Bill No`}),(0,p.jsx)(`input`,{type:`text`,value:F,disabled:!0,readOnly:!0,className:`flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 ml-2 font-semibold`})]}),(0,p.jsxs)(`div`,{className:`flex items-center`,children:[(0,p.jsx)(`label`,{className:`w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300`,children:`Counter Expenses`}),(0,p.jsx)(`input`,{type:`number`,min:`0`,step:`0.01`,value:z.counterExpenses,onChange:e=>B(t=>({...t,counterExpenses:e.target.value})),className:`flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ml-2`})]}),(0,p.jsxs)(`div`,{className:`flex items-start`,children:[(0,p.jsx)(`label`,{className:`w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300 mt-1`,children:`Notes`}),(0,p.jsx)(`textarea`,{value:z.notes,onChange:e=>B(t=>({...t,notes:e.target.value})),rows:3,className:`flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ml-2 resize-y`})]}),(0,p.jsxs)(`div`,{className:`flex items-center`,children:[(0,p.jsx)(`label`,{className:`w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300`,children:`Closing`}),(0,p.jsx)(`input`,{type:`text`,value:v(Y),disabled:!0,readOnly:!0,className:`flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 ml-2 font-semibold`})]}),(0,p.jsxs)(`div`,{children:[(0,p.jsxs)(`div`,{className:`flex items-center`,children:[(0,p.jsx)(`label`,{className:`w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300`,children:`Difference`}),(0,p.jsx)(`input`,{type:`text`,value:v(X),disabled:!0,readOnly:!0,className:`flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 ml-2 font-semibold`})]}),(0,p.jsx)(`p`,{className:`ml-[40%] pl-2 mt-1 text-xs text-gray-600 dark:text-gray-400`,children:`${v(Y)} - ${v(L)} = ${v(X)}`})]})]})]}),(0,p.jsxs)(`div`,{className:`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden`,children:[(0,p.jsx)(`div`,{className:`px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700`,children:(0,p.jsx)(`h2`,{className:`text-sm font-semibold text-gray-700 dark:text-gray-300`,children:`Denominations`})}),(0,p.jsx)(`div`,{className:`p-4 overflow-x-auto`,children:(0,p.jsxs)(`table`,{className:`w-full text-sm`,children:[(0,p.jsx)(`thead`,{className:`bg-blue-50 dark:bg-blue-900/30 text-gray-700 dark:text-gray-300`,children:(0,p.jsxs)(`tr`,{children:[(0,p.jsx)(`th`,{className:`border dark:border-gray-700 px-3 py-2 text-left`,children:`Denomination`}),(0,p.jsx)(`th`,{className:`border dark:border-gray-700 px-3 py-2 text-center`,children:`Count`}),(0,p.jsx)(`th`,{className:`border dark:border-gray-700 px-3 py-2 text-right`,children:`Value`})]})}),(0,p.jsxs)(`tbody`,{children:[m.map(e=>{let t=_(e),n=Math.max(0,h(z[t],0))*e;return(0,p.jsxs)(`tr`,{className:`hover:bg-gray-50 dark:hover:bg-gray-700/50`,children:[(0,p.jsxs)(`td`,{className:`border dark:border-gray-700 px-3 py-2 font-semibold`,children:[`₹`,e.toLocaleString(`en-IN`)]}),(0,p.jsx)(`td`,{className:`border dark:border-gray-700 px-3 py-2 text-center`,children:(0,p.jsx)(`input`,{type:`number`,min:`0`,value:z[t],onChange:e=>le(t,e.target.value),className:`w-24 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-2 py-1 text-right focus:ring-1 focus:ring-blue-500`})}),(0,p.jsx)(`td`,{className:`border dark:border-gray-700 px-3 py-2 text-right font-medium`,children:v(n)})]},e)}),(0,p.jsxs)(`tr`,{className:`bg-gray-50 dark:bg-gray-700`,children:[(0,p.jsx)(`td`,{className:`border dark:border-gray-700 px-3 py-2 font-semibold`,colSpan:`2`,children:`Total Closing`}),(0,p.jsx)(`td`,{className:`border dark:border-gray-700 px-3 py-2 text-right font-bold`,children:v(Y)})]})]})]})})]})]})}),T&&(0,p.jsx)(`p`,{className:`text-xs text-gray-500 dark:text-gray-400 px-1`,children:`Loading options...`})]})]})};export{S as default};