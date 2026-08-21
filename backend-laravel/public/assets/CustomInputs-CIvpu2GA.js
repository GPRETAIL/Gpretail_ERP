import{t as e}from"./jsx-runtime-KJkY8l8U.js";var t=e(),n=({label:e,name:n,required:r=!1,type:i=`text`,value:a,onChange:o,placeholder:s=``,disabled:c=!1})=>(0,t.jsxs)(`div`,{className:`flex items-center`,children:[(0,t.jsxs)(`label`,{className:`w-2/5 text-xs font-medium \r
      // 👇 Dark mode text color for label\r
      text-gray-700 dark:text-gray-300 text-right pr-3`,children:[r&&(0,t.jsx)(`span`,{className:`text-red-500 mr-1`,children:`*`}),` `,e]}),(0,t.jsx)(`input`,{type:i,name:n,value:a,onChange:o,placeholder:s,disabled:c,className:`flex-1 border 
      border-gray-300 dark:border-gray-600 rounded-sm p-1 text-xs 
      bg-white dark:bg-gray-700 dark:text-gray-200 
      focus:ring-1 focus:ring-blue-500 focus:border-blue-500
      ${c?`bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-70`:``}`})]}),r=({label:e,name:n,required:r=!1,options:i=[],value:a,onChange:o,disabled:s=!1})=>(0,t.jsxs)(`div`,{className:`flex items-center`,children:[(0,t.jsxs)(`label`,{className:`w-2/5 text-xs font-medium \r
      text-gray-700 dark:text-gray-300 text-right pr-3`,children:[r&&(0,t.jsx)(`span`,{className:`text-red-500 mr-1`,children:`*`}),` `,e]}),(0,t.jsxs)(`select`,{name:n,value:a,onChange:o,disabled:s,className:`flex-1  
       border
      border-gray-300 dark:border-gray-600 rounded-sm p-1 text-xs 

      bg-white dark:bg-gray-700 dark:text-gray-200
      focus:ring-1 focus:ring-blue-500 focus:border-blue-500
      ${s?`bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-70`:``}`,children:[(0,t.jsxs)(`option`,{value:``,children:[`Select `,e]}),(i||[]).map((e,n)=>(0,t.jsx)(`option`,{value:e.value||e.label,children:e.label},n))]})]}),i=({label:e,name:n,checked:r,onChange:i,disabled:a=!1})=>(0,t.jsxs)(`div`,{className:`flex items-center`,children:[(0,t.jsx)(`label`,{className:`w-2/5 text-xs font-medium \r
      text-gray-700 dark:text-gray-300 text-right pr-3`,children:e}),(0,t.jsx)(`input`,{type:`checkbox`,name:n,checked:r,disabled:a,onChange:i,className:`w-3 h-3 text-blue-600 
      border-gray-300 dark:border-gray-500 rounded focus:ring-1 focus:ring-blue-500 
      ${a?`cursor-not-allowed opacity-70`:``}`})]}),a=({label:e,checkName:n,checkValue:r,selectName:i,selectValue:a,options:o=[],onChange:s,disabled:c=!1})=>(0,t.jsxs)(`div`,{className:`flex items-center`,children:[(0,t.jsx)(`label`,{className:`w-2/5 text-xs font-medium \r
      text-gray-700 dark:text-gray-300 text-right pr-3`,children:e}),(0,t.jsxs)(`div`,{className:`flex-1 flex items-center gap-3`,children:[(0,t.jsx)(`input`,{type:`checkbox`,name:n,checked:r,onChange:s,disabled:c,className:`w-3 h-3 text-blue-600 
        border-gray-300 dark:border-gray-500 rounded focus:ring-1 focus:ring-blue-500 
        ${c?`cursor-not-allowed opacity-70`:``}`}),(0,t.jsxs)(`select`,{name:i,value:a,onChange:s,disabled:!r||c,className:`flex-1 border 
        border-gray-300 dark:border-gray-600 rounded-sm p-1 text-xs 
        // 👇 Dark mode select background and text color
        bg-white dark:bg-gray-700 dark:text-gray-200
        focus:ring-1 focus:ring-blue-500 focus:border-blue-500
        ${!r||c?`bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-70`:``}`,children:[(0,t.jsx)(`option`,{value:``,children:`Select`}),o.map((e,n)=>(0,t.jsx)(`option`,{value:e.value||e.label,children:e.label},n))]})]})]}),o=({label:e,name1:n,value1:r,name2:i,value2:a,onChange:o,disabled:s=!1})=>(0,t.jsxs)(`div`,{className:`flex items-center`,children:[(0,t.jsx)(`label`,{className:`w-2/5 text-xs font-medium \r
      text-gray-700 dark:text-gray-300 text-right pr-3`,children:e}),(0,t.jsxs)(`div`,{className:`flex-1 flex items-center gap-2`,children:[(0,t.jsx)(`input`,{type:`number`,name:n,value:r,onChange:o,placeholder:`Min`,disabled:s,className:`w-1/2 border 
        border-gray-300 dark:border-gray-600 rounded-sm p-1 text-xs 
        // 👇 Dark mode input background and text color
        bg-white dark:bg-gray-700 dark:text-gray-200
        focus:ring-1 focus:ring-blue-500 focus:border-blue-500
        ${s?`bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-70`:``}`}),(0,t.jsx)(`input`,{type:`number`,name:i,value:a,onChange:o,placeholder:`Max`,disabled:s,className:`w-1/2 border 
        border-gray-300 dark:border-gray-600 rounded-sm p-1 text-xs 
        // 👇 Dark mode input background and text color
        bg-white dark:bg-gray-700 dark:text-gray-200
        focus:ring-1 focus:ring-blue-500 focus:border-blue-500
        ${s?`bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-70`:``}`})]})]});export{n as a,r as i,a as n,o as r,i as t};