document.addEventListener('DOMContentLoaded', () => {
    if (location.pathname.indexOf('/index.html') >= 0 ||
        location.pathname === "/ru/master/") {
        document.getElementsByClassName('rst-footer-buttons')[0].style.display = "none";
        document.getElementsByClassName('headerlink')[0].style.display = "none";
        // document.getElementsByClassName('wy-nav-content')[0].style.maxWidth = "70%";
    }
    // use .. meta:: directive in rst to hide nextprev btns";
    if(document.querySelector("meta[name=view-npbtns]")){
        if(document.querySelector("meta[name=view-npbtns]").getAttribute("content")==="false"){
            // console.log("meta desc w cont")
            document.getElementsByClassName('rst-footer-buttons')[0].style.display = "none";
        }
        else{
            // console.log("meta desc not found");
        }

    }
    // let toclist = document.getElementsByClassName('wy-menu-vertical')[0].children;
    // if (toclist.length > 2) {
    //     for (let i = 0; i < toclist.length - 2; i++) {
    //         toclist[i].style.display = "none";
    //     }
    // }
});