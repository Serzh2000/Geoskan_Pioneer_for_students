"use strict"

// wait loading a pages and styles
document.addEventListener('DOMContentLoaded', () => {

let navTop = $('.wy-nav-top'),
	scrollPrev = 0;

// console.log(navTop);

	$(window).scroll(function(){
		let scrolled = $(window).scrollTop();
		if(scrolled > 100 && scrolled > scrollPrev){
			navTop.addClass('out');
		}
		else{
			navTop.removeClass('out');
		}
		scrollPrev = scrolled;
	});

})




