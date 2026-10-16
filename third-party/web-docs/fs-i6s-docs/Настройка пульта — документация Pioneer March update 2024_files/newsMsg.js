"use strict"

// wait loading a pages and styles
window.onload = function(){
	
	//Проверка, что файл находится не на локальной машине
	let urlCheck = document.location.href;
	// console.log(urlCheck);
	
	// if(urlCheck.indexOf('file') != -1){		
	// 	return;
	// }

	let newsMsgFlag = document.cookie.match(/newsMsgFlag=(.+?)(;|$)/);
	let sesBannerFlag = sessionStorage.getItem('sesBannerFlag');
	// console.log(sesBannerFlag);

	if (sesBannerFlag != null && sesBannerFlag == 1){

	// if (newsMsgFlag != null && newsMsgFlag[1] == 1 ){
		// console.log('not now')
		
	}
	else{
		setTimeout(function(){
			callMsg()
		},2000)		
	}
};

function callMsg(){
	//Generation of overlay, message block and childs
	//Overlay
	let overlay = document.createElement('div');
	overlay.className  = "msgOverlay";
	//Block
	let msgWrapper = document.createElement('div');
	msgWrapper.className  = "msgWrapper";

	let msgBlock = document.createElement('div');
	msgBlock.className  = "msgBlock msgBanner";

	// let msgBtnClose = document.createElement('span')
	// msgBtnClose.className = "btnClose"
	msgBlock.insertAdjacentHTML('afterbegin','<span class="btnClose material-symbols-outlined">close</span>')

	//Nesting
	overlay.prepend(msgWrapper);
	msgWrapper.appendChild(msgBlock);

	//Insert and display

	// let observer1 = new MutationObserver(callback);	
	// observer1.observe(document.body, {childList: true})

	// function callback(mutationRecords,observer){
		// console.log(mutationRecords);
		// let btn1 = document.getElementById('msgBtnOk');
		// let btn2 = document.getElementById('msgBtnClose');
		// setTimeout(function(){
		// 	btn1.style.transform = 'scale(1,1)';
		// 	btn2.style.transform = 'scale(1,1)';
		// },800)
		// observer1.disconnect();
	// }

	document.body.prepend(overlay);
	overlay.style.display = "flex";
	setTimeout(function(){overlay.style.opacity = "1";},20)

	//Add EventListener
	// const msgButtons = document.querySelectorAll('.msgBtn');
	const btnClose = msgBlock.querySelector('.btnClose')
	// console.log(btnClose)

	// msgButtons.forEach(elem => {
	// 	 elem.addEventListener('click', btnClick);		 
	// })
	btnClose.addEventListener('click', btnClick)
	msgBlock.addEventListener('click', btnClick)

	// document.cookie = "newsMsgFlag=1; max-age=604800; secure; samesite=strict; domain=geoscan.aero; path=/ru";
	sessionStorage.setItem('sesBannerFlag', 1);

	// 604800 - 1week	
}

function btnClick(e){	


	// if (event.target.id == 'msgBtnOk'){
	// 	closeNewsMsg(event);
	// 	window.location.href = 'https://docs.geoscan.aero/ru/master/learning-cases/main-cases.html#id3';

	
	if(e.target.classList.contains("btnClose")){
		closeNewsMsg(e);
	}
	if(e.target.classList.contains("msgBanner")){
		closeNewsMsg(e);
		window.open('https://geoscan.education/hello-pioneer-2025?utm_source=geoscan-docs-website&utm_medium=banner&utm_campaign=hello-pioneer-2025', '_blank');
	}		
}

function closeNewsMsg(e){
	
	let overlay = document.querySelectorAll('.msgOverlay');
	
	overlay[0].style.opacity = "0";
	setTimeout(function(){
		overlay[0].remove();
	},600)
}




