"use strict"

class JsonTable{

    constructor(target){
        
        this.payloadLink = target.dataset.jsonlink;
        this.target = target;
        console.log(target)
        this.init();
    }

    async init(){
        const res = await fetch(`${this.payloadLink}`,{
            method: 'GET',
            headers: {
                'Accept' : 'application/json',
                'Content-type' : 'application/json'
            }
        })
        const payload = await res.json();        
        
        this.buildTable(payload)
    }

    async buildTable(payload){
        console.log(payload);
        this.tableNav = this.addTableNav(payload);        
        this.selector = this.addSelector(payload.config.groups);
        this.contentList = this.addList(payload);
        this.options = this.addTableOption();
    }

    addTableNav(payload){
        const tableNav = document.createElement("div");
        tableNav.classList = "tbl-nav";
        this.target.appendChild(tableNav);
        return tableNav;
    }

    addList(payload){
        const contentList = document.createElement("div");
        contentList.classList = "tbl-cont";
        this.target.appendChild(contentList);

        const list = payload.content;
        console.log(list);

        for(let [i, val] of Object.entries(list)){
            const row = document.createElement("div");
            row.classList = "tbl-row";
            contentList.appendChild(row);
            console.log(val);
            
            for(let j = 0; j < val.length; j++){               
                const cell = document.createElement("a");
                const span = document.createElement("span");
                span.innerHTML = val[j];
                cell.appendChild(span);
                row.appendChild(cell);
            }
        }        
        contentList.firstChild.classList.add('tbl-attr');
        return contentList;
    }

    addSelector(options){        
        const selectList = document.createElement("select");
        selectList.id = "tbl-selection";
        this.tableNav.appendChild(selectList);

        console.log(options);

        //Create and append the options
        for (let [i, val] of options.entries()){
            const option = document.createElement("option");
            option.value = options[i];
            option.text = options[i];
            selectList.appendChild(option);
        }       

    }

    addTableOption(){
        const optionbar = document.createElement("div");
        optionbar.classList = "tbl-options"

        optionbar.innerHTML = `<a><span class="active-icon material-symbols-outlined">expand_circle_down</span></a>
                               <a><span class="active-icon material-symbols-outlined">open_in_new</span></a>`
        
        this.target.appendChild(optionbar);
    }


    eventsHandler(){

    }

}


document.addEventListener('DOMContentLoaded', ()=>{
	const jsontables = document.querySelectorAll('.jsontable');
	
	for(let i = 0; i<jsontables.length; i++){
		new JsonTable(jsontables[i]);
	}

})