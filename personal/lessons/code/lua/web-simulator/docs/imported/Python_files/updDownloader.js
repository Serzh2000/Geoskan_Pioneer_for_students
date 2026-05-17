"use strict"

class UpdateDownloader{

    constructor(target){
        this.target = target;
        this.payloadLink = "https://functions.yandexcloud.net/d4elsr99u5leqpri4fvq";
        this.device = target.dataset.device;
        this.label = target.dataset.label;
        // this.badge = target.dataset.badge !== undefined ? target.dataset.badge : false;
        this.badge = true;
        console.log(this.device);
        console.log(target);
        this.init();
    }

    async init(){
      // console.log(this.payloadLink);
        const url = `${this.payloadLink}?device=${encodeURIComponent(this.device)}`;
        
        const res = await fetch(url,{
          method: 'GET',
          headers: {
              'Accept' : 'application/json',
              // 'Content-type' : 'application/json'
          }
      })
      const payload = await res.json();
      this.content = this.buildTable(payload);
    }

    async buildTable(payload){
      if (payload.version_list){
          console.log(payload);
          this.revList = payload.version_list;
          this.revLink = payload.objects;
          
          // Создаем выпадающий список
          const dropdown = document.createElement('div');
                dropdown.classList.add("dropdown");
                
                this.target.style.display = "inline-flex";
    
          // Создаем кнопку для выпадающего списка
          const btn = document.createElement('a');
            //  btn.classList.add("btn", "btn-secondary", "dropdown-toggle"); // тип кнопки
                btn.classList.add("dropdown-toggle"); // тип текста
                btn.href = "#";
                btn.setAttribute('role', 'button');
                btn.setAttribute('data-bs-toggle', 'dropdown');
                btn.setAttribute('aria-expanded', 'false');
                // btn.innerHTML = (this.revList[this.revList.length-1]);
                btn.innerHTML = this.label;                   
    
          const ul = document.createElement('ul');
                ul.classList.add('dropdown-menu');
                
          let dividerAdded = false;
    
          for (let i = 0; i < this.revList.length; i++) {
              const listItem = document.createElement('li');
                    listItem.style.listStyle = 'none';
                    listItem.style.margin = '0';

              const downloadLink = document.createElement('a');
                    downloadLink.classList.add('dropdown-item', 'd-flex', 'justify-content-between', 'align-items-center');
              const link = 'https://storage.yandexcloud.net/download.geoscan.ru/'+`${this.revLink[i]}`;
                    downloadLink.href = link;
                    downloadLink.innerHTML = this.revList[i];

              const badge = (this.badge && i === this.revList.length - 1)
                    ? '<span class="badge text-bg-light ms-2">Последняя версия</span>'
                    : '';

                    downloadLink.innerHTML = `${this.revList[i]} ${badge}`            
             
              listItem.appendChild(downloadLink);
              // Добавляем элемент в список
              ul.prepend(listItem);           
          }

        if (this.revList.length > 2 && ul.children.length > 1) {
            const divider = document.createElement('li');
                  divider.style.listStyle = 'none';
                  divider.style.margin = '0';
                  divider.innerHTML = '<hr class="dropdown-divider">';
            
            // Вставляем разделитель после первого элемента (индекс 1)
            ul.insertBefore(divider, ul.children[1]);

            // if (this.badge){
            //   const badge = document.createElement('span');
            //         badge.classList.add('badge','rounded-pill','text-bg-success');
            //         badge.innerHTML = "Последняя версия";
            //   ul.children[0].appendChild(badge);
            //   ul.children[0].classList.add('d-flex','justify-content-between','align-items-center');
            // }
        }
          
          dropdown.appendChild(btn);
          dropdown.appendChild(ul);
    
          this.target.appendChild(dropdown);
      }
    }
  
  // Метод для скачивания версии
  downloadVersion(version) {
      console.log('Скачивание версии:', version);      
      // Например: window.location.href = `/download/${version}`;
  }

  // addDeviceNav(){    
  // }

  // addDwnldBtn(){

  // }

}

document.addEventListener('DOMContentLoaded', ()=>{
	const updDownloader = document.querySelectorAll('.updDownloader');
	
	for(let i = 0; i<updDownloader.length; i++){
		new UpdateDownloader(updDownloader[i]);
	}

})


// async function getData(url){
//     // let url = "https://functions.yandexcloud.net/d4elsr99u5leqpri4fvq"
//     let response = await fetch(url,{
//       method: "GET"
//     })
//     if(response.ok){
//       let json = await response.json();
//       return json;
//     }
//     else{
//       alert("Error HTTP: " + response.status);
//     }
// }