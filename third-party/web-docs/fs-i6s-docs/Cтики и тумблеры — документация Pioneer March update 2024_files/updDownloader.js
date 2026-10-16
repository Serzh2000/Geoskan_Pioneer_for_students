"use strict"

class UpdateDownloader{

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
    
    // this.buildTable(payload)

    console.log(payload)
    }

}

document.addEventListener('DOMContentLoaded', ()=>{
	const jsontables = document.querySelectorAll('.updDownloader');
	
	for(let i = 0; i<jsontables.length; i++){
		new JsonTable(jsontables[i]);
	}

})