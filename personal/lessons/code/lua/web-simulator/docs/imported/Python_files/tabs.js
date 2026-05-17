"use strict"

class Tabs{
	constructor(target, config){
		const defaultConfig={};
		this.config = Object.assign(defaultConfig, config);
		this.elTabs = typeof target === 'string' ? document.querySelectorAll(target) : target;
		this.elButtons = this.elTabs.querySelectorAll('.tabs_btn');
		this.elPanes = this.elTabs.querySelectorAll('.tabs_pane');
		this.eventShow = new Event('tab.itc.change');
		this.init();
		this.regEventsHandler();
	}
	init(){
		this.elTabs.setAttribute('role','tablist');
		this.elButtons.forEach((el, index) =>{
			el.dataset.index = index;
			el.setAttribute('role', 'tab');
			this.elPanes[index].setAttribute('role','tabpanel');			
		})
	}

	show(elLinkTarget){
		// console.log('show');
		const elPanelTarget = this.elPanes[elLinkTarget.dataset.index];
		const elLinkActive = this.elTabs.querySelector('.tabs_btn_active');
		const elPanelShow = this.elTabs.querySelector('.tabs_pane_show');
		

		if(elLinkTarget === elLinkActive){
			return;
		}

		elLinkActive ? elLinkActive.classList.remove('tabs_btn_active') : null;
		elPanelShow ? elPanelShow.classList.remove('tabs_pane_show') : null;
		elLinkTarget.classList.add('tabs_btn_active');
		elPanelTarget.classList.add('tabs_pane_show');
		this.elTabs.dispatchEvent(this.eventShow);
		elLinkTarget.focus();
	}

	regEventsHandler(){
		// console.log(this.elTabs);
		this.elTabs.addEventListener('click',(e) =>{
			const target = e.target.closest('.tabs_btn');
			
			if(target){
				e.preventDefault();
				this.show(target);			
			}
		})
	}

}

document.addEventListener('DOMContentLoaded', ()=>{
	const tabs = document.querySelectorAll('.tabs');
	// console.log(tabs);
	for(let i = 0; i<tabs.length; i++){
		new Tabs(tabs[i]);
	}

	let tabsPane = document.querySelectorAll('.tabs_pane');
	// console.log(tabsPane);

	tabsPane.forEach((item, index) =>{		
		let paneHeader = document.createElement('div');
	})

})