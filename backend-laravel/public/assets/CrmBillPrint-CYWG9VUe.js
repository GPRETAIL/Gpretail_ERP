import{a as e,n as t,t as n}from"./jsx-runtime-KJkY8l8U.js";import{l as r}from"./chunk-KS7C4IRE-D0ZtfwCk.js";import{t as i}from"./axios-DctJJlF9.js";import{t as a}from"./FilterableDataTable-gwa-xjA0.js";import{n as o}from"./dist-BJm-ZY9X.js";import{t as s}from"./arrow-left-anTmZ75Q.js";import{t as c}from"./chevron-down-DAK4wCis.js";import{c as l,g as u}from"./index-CPYGHgCP.js";var d=e(t(),1),f=n(),p=[{key:`location`,label:`Location`},{key:`counter`,label:`Counter`},{key:`customerName`,label:`Customer Name`},{key:`mobileNo`,label:`Mobile No`},{key:`gstNo`,label:`GST`},{key:`billNo`,label:`Bill No`},{key:`billDate`,label:`Bill Date`},{key:`billValue`,label:`Bill Value`},{key:`printedStatus`,label:`Printed`}],m=`crm.bill_print.printed_orders`,h=(e,t=`--`)=>{if(e==null)return t;let n=String(e).trim();return n===``?t:n},g=e=>Number(e||0).toLocaleString(`en-IN`,{minimumFractionDigits:2,maximumFractionDigits:2}),_=e=>{if(!e)return`--`;let t=new Date(e);return Number.isNaN(t.getTime())?h(e):t.toLocaleDateString(`en-GB`)},v=e=>String(e??``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`),y=(e,t=!1)=>({id:e.id,location:h(e.location?.name),counter:h(e.counter?.name),customerName:h(e.customer_name||e.customer?.name),mobileNo:h(e.customer_mobile||e.customer?.mobile_no),gstNo:h(e.customer?.gst_no),billNo:h(e.order_no),billDate:h(e.order_date),billValue:g(e.total_amount),printedStatus:t?`Printed`:`Not Printed`}),b=(e={})=>{let t=h(e.company?.name,`Company`),n=Array.isArray(e.items)?e.items:[],r=Number(e.total_amount||0),i=Number(e.total_qty||0),a=n.map(e=>`
      <tr>
        <td>${v(h(e.product_name||e.product?.name,`-`))}</td>
        <td class="num">${v(Number(e.qty||0).toFixed(3))}</td>
        <td class="num">${v(Number(e.price||0).toFixed(2))}</td>
        <td class="num">0%</td>
        <td class="num">${v(Number(e.amount||0).toFixed(2))}</td>
      </tr>
    `).join(``);return`
    <html>
      <head>
        <title>Receipt #${v(h(e.order_no))}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 12px; color: #111; }
          .receipt { width: 300px; margin: 0 auto; font-size: 12px; }
          .center { text-align: center; }
          .title { font-size: 17px; font-weight: 700; margin-bottom: 4px; }
          .meta { margin-top: 8px; margin-bottom: 8px; }
          .line { border-top: 1px dashed #222; margin: 7px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { padding: 3px 2px; border-bottom: 1px solid #e2e8f0; text-align: left; }
          th { font-size: 10px; color: #374151; }
          .num { text-align: right; white-space: nowrap; }
          .totals { margin-top: 8px; font-size: 12px; }
          .totals-row { display: flex; justify-content: space-between; margin: 3px 0; }
          .grand { font-weight: 700; font-size: 14px; }
          .footer-note { text-align: center; margin-top: 10px; font-size: 11px; line-height: 1.35; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="center title">${v(t)}</div>
          <div class="meta">
            <div>Sale No: <b>${v(h(e.order_no))}</b></div>
            <div>Date: <b>${v(_(e.order_date))}</b></div>
            <div>Cashier: <b>${v(h(e.receivedBy?.name))}</b></div>
            <div>Customer: <b>${v(h(e.customer_name||e.customer?.name))}</b></div>
          </div>
          <div class="line"></div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th class="num">QTY</th>
                <th class="num">Rate</th>
                <th class="num">Tax</th>
                <th class="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${a||`<tr><td colspan="5" class="center">No items</td></tr>`}
            </tbody>
          </table>
          <div class="totals">
            <div class="totals-row"><span>Total Qty</span><b>${v(i.toFixed(3))}</b></div>
            <div class="totals-row grand"><span>Grand Total</span><span>Rs.${v(r.toFixed(2))}</span></div>
          </div>
          <div class="footer-note">
            Thank you for shopping with us.<br />
            Goods once sold cannot be exchanged without bill.
          </div>
        </div>
      </body>
    </html>
  `},x=(e={})=>{let t=h(e.company?.name,`Company`),n=Array.isArray(e.items)?e.items:[],r=Number(e.total_amount||0),i=h(e.customer_name||e.customer?.name),a=h(e.customer_mobile||e.customer?.mobile_no),o=h(e.customer?.gst_no),s=h(e.customer_address||e.customer?.address),c=h(e.company?.gst_no||e.company?.gstin,``),l=h(e.company?.tan_pan||e.company?.pan,``),u=n.map((e,t)=>`
      <tr>
        <td>${t+1}</td>
        <td>${v(h(e.hsn_code||`-`,`-`))}</td>
        <td>${v(h(e.barcode||`-`,`-`))}</td>
        <td>${v(h(e.product_name||e.product?.name,`-`))}</td>
        <td class="num">0</td>
        <td class="num">${v(Number(e.price||0).toFixed(2))}</td>
        <td class="num">${v(Number(e.qty||0).toFixed(3))}</td>
        <td class="num">0.00</td>
        <td class="num">${v(Number(e.amount||0).toFixed(2))}</td>
      </tr>
    `).join(``),d=Math.max(0,20-n.length),f=Array.from({length:d}).map(()=>`
      <tr>
        <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
      </tr>
    `).join(``);return`
    <html>
      <head>
        <title>Invoice #${v(h(e.order_no))}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 18px; color: #111827; }
          .sheet { width: 100%; max-width: 980px; margin: 0 auto; }
          .top-title { text-align: center; font-size: 24px; font-weight: 700; margin-bottom: 6px; }
          .row { display: flex; justify-content: space-between; gap: 14px; margin-bottom: 8px; }
          .cell { flex: 1; font-size: 13px; }
          .label { color: #374151; margin-right: 6px; font-weight: 700; }
          .invoice-title { text-align: center; font-weight: 700; font-size: 20px; margin: 12px 0; }
          .border-line { border-top: 1px solid #111827; margin: 8px 0 10px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #111827; padding: 5px 6px; text-align: left; }
          th { background: #f3f4f6; font-size: 11px; }
          .num { text-align: right; white-space: nowrap; }
          .totals { margin-top: 10px; margin-left: auto; width: 320px; font-size: 13px; }
          .totals-row { display: flex; justify-content: space-between; margin: 5px 0; }
          .grand { font-size: 16px; font-weight: 700; border-top: 1px solid #111827; padding-top: 6px; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="top-title">${v(t)}</div>
          <div class="row">
            <div class="cell">
              ${c?`<div><span class="label">GSTIN</span> ${v(c)}</div>`:``}
              ${l?`<div><span class="label">PAN</span> ${v(l)}</div>`:``}
            </div>
            <div class="cell" style="text-align:right;">
              <div><span class="label">Bill No</span> ${v(h(e.order_no))}</div>
              <div><span class="label">Bill Date</span> ${v(_(e.order_date))}</div>
            </div>
          </div>
          <div class="border-line"></div>

          <div class="invoice-title">SALES INVOICE</div>
          <div class="row">
            <div class="cell">
              <div><span class="label">Customer Name</span> ${v(i)}</div>
              <div><span class="label">Mobile No</span> ${v(a)}</div>
              <div><span class="label">GST No</span> ${v(o)}</div>
              <div><span class="label">Address</span> ${v(s)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:55px;">S.No</th>
                <th style="width:90px;">HSN</th>
                <th style="width:120px;">BARCODE</th>
                <th>ITEMS</th>
                <th style="width:70px;" class="num">TAX</th>
                <th style="width:80px;" class="num">RATE</th>
                <th style="width:80px;" class="num">QTY</th>
                <th style="width:80px;" class="num">DISC</th>
                <th style="width:110px;" class="num">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${u||``}
              ${f}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row"><span>Total Qty</span><b>${v(Number(e.total_qty||0).toFixed(3))}</b></div>
            <div class="totals-row"><span>Paid</span><b>${v(Number(e.paid_amount||0).toFixed(2))}</b></div>
            <div class="totals-row"><span>Balance</span><b>${v(Number(e.balance_amount||0).toFixed(2))}</b></div>
            <div class="totals-row grand"><span>Invoice Value</span><span>Rs.${v(r.toFixed(2))}</span></div>
          </div>
        </div>
      </body>
    </html>
  `},S=()=>{let e=r(),{printHtml:t}=u(),[n,g]=(0,d.useState)([]),[_,v]=(0,d.useState)(!0),[S,C]=(0,d.useState)(1),[w,T]=(0,d.useState)(10),[E,D]=(0,d.useState)({total:0,totalPages:1}),[O,k]=(0,d.useState)({query:``,field:`all`,fetchAll:!1}),[A,j]=(0,d.useState)(()=>{try{let e=localStorage.getItem(m);if(!e)return{};let t=JSON.parse(e);return t&&typeof t==`object`?t:{}}catch{return{}}}),M=(0,d.useRef)(A),[N,P]=(0,d.useState)(null),[F,I]=(0,d.useState)(null);(0,d.useEffect)(()=>{M.current=A},[A]),(0,d.useEffect)(()=>{let e=()=>P(null),t=t=>{t.target?.closest?.(`[data-bill-print-menu]`)||e()};return document.addEventListener(`mousedown`,t),window.addEventListener(`resize`,e),window.addEventListener(`scroll`,e,!0),()=>{document.removeEventListener(`mousedown`,t),window.removeEventListener(`resize`,e),window.removeEventListener(`scroll`,e,!0)}},[]);let L=(0,d.useCallback)(e=>{let t=String(e||``);t&&(j(e=>{if(e[t])return e;let n={...e,[t]:!0};try{localStorage.setItem(m,JSON.stringify(n))}catch{}return n}),g(e=>e.map(e=>String(e.id)===t?{...e,printedStatus:`Printed`}:e)))},[]),R=(0,d.useCallback)(async(e=S,t=w,n=!1,r=O.query,a=O.field)=>{try{v(!0);let o=String(r||``).trim(),s=n||o!==``,c=s?{all:`true`,search:o||void 0,field:a&&a!==`all`?a:void 0}:{page:e,limit:t},l=await i.get(`/customer-orders`,{params:c}),u=(l.data?.data||[]).map(e=>y(e,!!M.current[String(e.id)]));if(g(u),s||!l.data?.pagination)D({total:u.length,totalPages:1});else{let e=l.data.pagination;D({total:Number(e.total)||0,totalPages:Math.max(Number(e.totalPages)||1,1)})}}catch(e){o.error(e?.response?.data?.message||`Failed to load customer bills`)}finally{v(!1)}},[S,w,O]);(0,d.useEffect)(()=>{let e=String(O.query||``).trim()!==``;R(S,w,e||O.fetchAll,O.query,O.field)},[R,S,w,O]);let z=async(e,n)=>{try{I(e.id),P(null);let r=(await i.get(`/customer-orders/${e.id}`)).data?.data;if(!r){o.error(`Order data not found`);return}if(n===`invoice`){let n=x(r);t(n,{label:`Invoice-${h(r.order_no,e.billNo)}`,docType:`crm_invoice`,companyId:Number(r.company_id||r.company?.id||0)||void 0,copies:1})&&L(e.id);return}let a=b(r);t(a,{label:`Receipt-${h(r.order_no,e.billNo)}`,docType:`crm_receipt`,companyId:Number(r.company_id||r.company?.id||0)||void 0,copies:1,receiptData:{storeName:h(r.company?.name,`Store`),storeAddress:h(r.company?.address,``),storePhone:h(r.company?.mobile_no||r.company?.phone,``),billNo:h(r.order_no),dateTime:r.order_date||new Date().toISOString(),cashierName:h(r.receivedBy?.name,``),items:(r.items||[]).map(e=>({name:h(e.product_name||e.product?.name,``),qty:Number(e.qty||0),rate:Number(e.price||0),amount:Number(e.amount||0),code:h(e.barcode||e.code,``)})),subTotal:Number(r.total_amount||0),taxAmount:0,total:Number(r.total_amount||0),paidAmount:Number(r.paid_amount||0),changeAmount:0,paymentMethod:``,footerNote:`Thank you!`}})&&L(e.id)}catch(e){o.error(e?.response?.data?.message||`Failed to print bill`)}finally{I(null)}},B=(0,d.useMemo)(()=>p,[]);return(0,f.jsxs)(`div`,{className:`min-h-[70vh] bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100`,children:[(0,f.jsx)(`div`,{className:`flex justify-between items-center px-4 py-1 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm`,children:(0,f.jsxs)(`div`,{className:`flex items-center space-x-2`,children:[(0,f.jsx)(`button`,{className:`text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200`,onClick:()=>e(-1),children:(0,f.jsx)(s,{className:`w-4 h-4`})}),(0,f.jsxs)(`h1`,{className:`text-sm font-semibold flex items-center gap-1`,children:[(0,f.jsx)(`button`,{type:`button`,onClick:()=>e(`/crm`),className:`text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline`,children:`CRM`}),(0,f.jsx)(`span`,{className:`text-gray-500 dark:text-gray-400`,children:`/`}),(0,f.jsx)(`span`,{children:`Bill Print`})]})]})}),(0,f.jsx)(`div`,{className:`p-3 pb-16`,children:(0,f.jsxs)(`div`,{className:`bg-white dark:bg-gray-800 shadow-lg rounded-lg p-5 border border-gray-200 dark:border-gray-700`,children:[(0,f.jsx)(`h2`,{className:`text-lg font-bold mb-3`,children:`Bill Print Search`}),(0,f.jsx)(a,{rows:n,columns:B,loading:_,emptyText:`No customer bills found. Click Search to load data.`,searchPlaceholder:`Search customer bills...`,enableColumnResize:!0,tablePreferenceKey:`crm.bill_print.list`,onRefresh:()=>R(1,w,String(O.query||``).trim()!==``||O.fetchAll,O.query,O.field),refreshDisabled:_,page:S,limit:w,totalPages:E.totalPages,totalRows:E.total,onPageChange:C,onLimitChange:e=>{T(e),C(1)},paginationMode:`server`,enableServerSearch:!0,onServerSearch:({query:e,field:t,fetchAll:n})=>{let r={query:String(e||``).trim(),field:t||`all`,fetchAll:!!n};k(e=>e.query===r.query&&e.field===r.field&&e.fetchAll===r.fetchAll?e:r),S!==1&&C(1)},onExportRows:async({query:e,field:t})=>{let n={all:`true`},r=String(e||``).trim();return r&&(n.search=r),t&&t!==`all`&&(n.field=t),((await i.get(`/customer-orders`,{params:n})).data?.data||[]).map(e=>y(e,!!M.current[String(e.id)]))},renderActions:e=>(0,f.jsx)(`div`,{className:`relative`,"data-bill-print-menu":!0,children:(0,f.jsxs)(`button`,{type:`button`,className:`glass-btn glass-btn-primary inline-flex items-center gap-1 disabled:opacity-50`,onClick:t=>{let n=t.currentTarget.getBoundingClientRect(),r=Math.min(Math.max(n.right-128,8),window.innerWidth-128-8),i=n.bottom+4;P(t=>t?.row?.id===e.id?null:{row:e,top:i,left:r})},disabled:F===e.id,children:[(0,f.jsx)(l,{className:`w-3.5 h-3.5`}),`Print`,(0,f.jsx)(c,{className:`w-3 h-3`})]})}),actionsLabel:`Action`,exportFileName:`crm_bill_print`}),N&&(0,f.jsxs)(`div`,{"data-bill-print-menu":!0,className:`fixed z-[1300] min-w-[120px] rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 shadow-lg`,style:{top:`${N.top}px`,left:`${N.left}px`},children:[(0,f.jsx)(`button`,{type:`button`,className:`block w-full px-3 py-1 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700`,onClick:()=>z(N.row,`invoice`),children:`Invoice`}),(0,f.jsx)(`button`,{type:`button`,className:`block w-full px-3 py-1 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700`,onClick:()=>z(N.row,`receipt`),children:`Receipt`})]})]})})]})};export{S as default};