import{a as e,n as t,t as n}from"./jsx-runtime-KJkY8l8U.js";import{l as r}from"./chunk-KS7C4IRE-D0ZtfwCk.js";import{t as i}from"./axios-DctJJlF9.js";import{n as a,t as o}from"./FilterableDataTable-BSqu_M6t.js";import{t as s}from"./arrow-left-anTmZ75Q.js";import{t as c}from"./Toast-DV7nYFCE.js";import{t as l}from"./pencil-BtlTbYZM.js";import{g as u}from"./index-CTUhg4DQ.js";import{t as d}from"./ConfirmDialog-CScPmKTG.js";var f=e(t(),1),p=n(),m=e=>{let t=parseFloat(e);return Number.isFinite(t)?t:0},h=e=>e?new Date(e).toLocaleDateString(`en-IN`,{day:`2-digit`,month:`2-digit`,year:`numeric`}):`-`,g=()=>{let e=r(),{printHtml:t}=u(),[n,g]=(0,f.useState)({open:!1,type:`info`,message:``}),[_,v]=(0,f.useState)(!0),[y,b]=(0,f.useState)([]),[x,S]=(0,f.useState)({open:!1,keys:[]}),[C,w]=(0,f.useState)([]),[T,E]=(0,f.useState)(1),[D,O]=(0,f.useState)(20),k=(0,f.useMemo)(()=>[{key:`return_no`,label:`Return No`,valueGetter:e=>e.return_no||`-`},{key:`return_date`,label:`Date`,valueGetter:e=>e.return_date||``,render:e=>h(e),searchValue:e=>h(e.return_date)},{key:`supplier`,label:`Supplier`,valueGetter:e=>e.supplier?.name||`-`},{key:`company`,label:`Company`,valueGetter:e=>e.company?.name||`-`},{key:`transport`,label:`Transport`,valueGetter:e=>e.transport?.name||`-`},{key:`total_qty`,label:`Qty`,valueGetter:e=>Number(e.total_qty||0),render:e=>(0,p.jsx)(`div`,{className:`text-right`,children:Number(e||0)})},{key:`total_amount`,label:`Amount`,valueGetter:e=>m(e.total_amount),render:e=>(0,p.jsx)(`div`,{className:`text-right`,children:m(e).toFixed(2)})}],[]),A=(0,f.useMemo)(()=>{let e=C.length;return{total:e,totalPages:Math.max(Math.ceil(e/Math.max(D,1)),1)}},[C.length,D]),j=async()=>{v(!0);try{let e=await i.get(`/purchase-returns`,{params:{all:`true`}});w(e.data?.data||[])}catch(e){console.error(`Failed to search purchase returns:`,e),g({open:!0,type:`error`,message:`Failed to search purchase returns`})}finally{v(!1)}},M=e=>{S({open:!0,keys:e})},N=async()=>{let{keys:e}=x;S({open:!1,keys:[]});try{await Promise.all(e.map(e=>i.delete(`/purchase-returns/${e}`))),g({open:!0,type:`success`,message:`${e.length} record(s) deleted`}),b([]),j()}catch{g({open:!0,type:`error`,message:`Failed to delete some records`})}},P=e=>{let n=(e.items||[]).map((e,t)=>`
          <tr>
            <td>${t+1}</td>
            <td>${e.barcode||`-`}</td>
            <td>${e.product_name||`-`}</td>
            <td>${e.return_qty||0}</td>
            <td style="text-align:right;">${m(e.amount).toFixed(2)}</td>
          </tr>
        `).join(``),r=`
      <html>
        <head>
          <title>Purchase Return ${e.return_no}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 13px; }
            th { background: #f3f4f6; text-align: left; }
          </style>
        </head>
        <body>
          <h2>Purchase Return</h2>
          <div>Return No: ${e.return_no}</div>
          <div>Date: ${e.return_date}</div>
          <div>Supplier: ${e.supplier?.name||`-`}</div>
          <div>Company: ${e.company?.name||`-`}</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Barcode</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>${n}</tbody>
          </table>
        </body>
      </html>
    `;t(r,{label:`PurchaseReturn-${e.return_no||e.id||`print`}`,docType:`purchase_return`,companyId:Number(e.company_id||e.company?.id||0)||void 0,copies:1})};return(0,f.useEffect)(()=>{j()},[]),(0,p.jsxs)(`div`,{className:`h-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 flex flex-col master-responsive`,children:[(0,p.jsx)(d,{open:x.open,message:`Are you sure you want to delete ${x.keys.length} selected record(s)? This action cannot be undone.`,onConfirm:N,onCancel:()=>S({open:!1,keys:[]})}),(0,p.jsxs)(`div`,{className:`flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm`,children:[(0,p.jsxs)(`div`,{className:`flex items-center`,children:[(0,p.jsx)(`button`,{className:`text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mr-3 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700`,"aria-label":`Back`,onClick:()=>e(`/warehouse/purchase-return`),children:(0,p.jsx)(s,{className:`w-4 h-4`})}),(0,p.jsxs)(`h1`,{className:`text-sm font-semibold flex items-center gap-1`,children:[(0,p.jsx)(`button`,{type:`button`,onClick:()=>e(`/warehouse`),className:`text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline`,children:`Warehouse`}),(0,p.jsx)(`span`,{className:`text-gray-500 dark:text-gray-400`,children:`/`}),(0,p.jsx)(`span`,{children:`Purchase Return Search`})]})]}),(0,p.jsx)(a,{columns:k,rows:C,selectedRowKeys:y,onExportRows:async()=>(await i.get(`/purchase-returns`,{params:{all:`true`}})).data?.data||[],fileName:`purchase_return_search`,buttonClassName:`topbar-action-btn topbar-action-export`})]}),(0,p.jsx)(`div`,{className:`flex-1 p-4 min-h-0`,children:(0,p.jsx)(`div`,{className:`bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-sm p-3 h-full flex flex-col min-h-0`,children:(0,p.jsx)(o,{rows:C,columns:k,loading:_,loadingText:`Searching purchase returns...`,emptyText:`No purchase return records found.`,searchPlaceholder:`Search in purchase return fields...`,showExport:!1,tablePreferenceKey:`warehouse.purchase_return_search.list`,onRefresh:j,refreshDisabled:_,page:T,limit:D,totalPages:A.totalPages,totalRows:A.total,onPageChange:E,onLimitChange:e=>{O(e),E(1)},paginationMode:`client`,fillHeight:!0,onRowClick:t=>e(`/warehouse/purchase-return?edit=${t.id}`),enableKeyboardNav:!0,enableSelection:!0,selectedRows:y,onSelectionChange:b,onBulkDelete:M,renderActions:(t,{selectedCount:n}={})=>(0,p.jsxs)(`div`,{className:`flex items-center justify-center gap-2`,children:[(0,p.jsx)(`button`,{type:`button`,onClick:()=>e(`/warehouse/purchase-return?edit=${t.id}`),title:`Edit`,disabled:n>1,className:`glass-btn glass-btn-primary rounded p-1.5`,children:(0,p.jsx)(l,{className:`w-3.5 h-3.5`})}),(0,p.jsx)(`button`,{type:`button`,onClick:()=>P(t),className:`text-blue-600 dark:text-blue-400 hover:underline`,children:`Print`})]})})})}),(0,p.jsx)(c,{open:n.open,type:n.type,message:n.message,onClose:()=>g(e=>({...e,open:!1}))})]})};export{g as default};