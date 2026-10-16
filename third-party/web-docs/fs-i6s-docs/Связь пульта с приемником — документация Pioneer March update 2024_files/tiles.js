document.addEventListener("DOMContentLoaded", () => {
    // let tileHeight = getComputedStyle(document.documentElement).getPropertyValue('--tile-height');
    document.querySelectorAll(".tile").forEach(plate => {
        let tileHeight = window.getComputedStyle(plate, null).height
        // let title = plate.querySelector('.title')
        // console.log(title)
        var a = [
            plate.querySelector('.title')
            // title.getElementsByClassName('header'),            
            // title.getElementsByClassName('spacer')
            ].forEach(aKey => {
                console.log(aKey)
                aKey.addEventListener('click', event => {
                    if (tileHeight.includes(plate.style.height) || plate.style.height == '') {
                        // plate.style.height = plate.scrollHeight + 'px';
                        plate.classList.toggle('large');
                    } else {
                        console.log("tljs els1")
                        // plate.style.height = tileHeight;
                        plate.classList.toggle('large');
                    }
                });

        });
        window.addEventListener('resize', event => {
            if (!tileHeight.includes(plate.style.height) && plate.style.height != ''){
                // plate.style.height = plate.scrollHeight + 'px';
            }
        });
    });

});

