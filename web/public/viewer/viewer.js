
// Initialize Firebase
// TODO: Replace with your project's customized code snippet
var config = {
  apiKey: "<API_KEY>",
  authDomain: "<PROJECT_ID>.firebaseapp.com",
  databaseURL: "https://bullman-staging.firebaseio.com",
  storageBucket: "<BUCKET>.appspot.com",
  messagingSenderId: "<SENDER_ID>",
};
firebase.initializeApp(config);
var defaultDatabase = firebase.database();
var jobsRef = firebase.database().ref('jobs/demo');
jobsRef.on('value', function(snapshot) {
  updateOverlay(snapshot.val())
});

function updateOverlay(overlays){
  console.log(overlays);
  handleMarquee(overlays);
  handleEmoticons(overlays);
  handlePictureInPicture(overlays);
  handleWinter(overlays);
  handleAutumn(overlays);
}

function handleMarquee(overlays){
  if(overlays.marquee.show){
    $(".marquee").fadeIn(500);
  }else{
    $(".marquee").fadeOut(500);
  }
  $(".marquee-content").html(overlays.marquee.message);
}

function handleEmoticons(overlays){
  if(overlays.emojis.emoji1.show){
    var emoji1 = $(".emoji-1");
    emoji1.fadeIn(500);
    emoji1.animate({
      bottom: "+=700",
      left: "+=800",
      opacity: 0
    }, 1500, "swing", function() {
      $(this).removeAttr('style');
    });
  }else{
    $(".emoji-1").fadeOut(500);
  }
}

function handlePictureInPicture(overlays){
  if(overlays.pip.show){
    var pip = $(".pip");
    pip.fadeIn(500);
    pip.css({top: overlays.pip.position.top, left: overlays.pip.position.left});
  }else{
    $(".pip").fadeOut(500);
  }

}

function handleWinter(overlays){
  var winter = $("#winter");
  if(overlays.winter.show){
    winter.fadeIn(500);
  }else{
    winter.fadeOut(500);
  }
}


function handleAutumn(overlays){
    if(overlays.autumn.show){

      TweenLite.set("#holder",{perspective:1000})
      TweenLite.set("img",{xPercent:"-50%",yPercent:"-50%"})

      var total = 30;
      var warp = document.getElementById("holder");
      var w = window.innerWidth;
      var h = window.innerHeight;

       for (i=0; i<total; i++){
         var Div = document.createElement('div');
         TweenLite.set(Div,{attr:{class:'dot'},x:R(0,w),y:R(-800,-150),z:R(-200,200)});
         warp.appendChild(Div);
         animm(Div, w, h);
       }
    }else{
      var warp = document.getElementById("holder");
      var paras = document.getElementsByClassName('dot');

      while(paras[0]) {
          paras[0].parentNode.removeChild(paras[0]);
      }
    }
}

function animm(elm, w, h){
  TweenMax.to(elm,R(6,15),{y:0,ease:Linear.easeNone,repeat:-1,delay:-15});
  TweenMax.to(elm,R(4,8),{x:'+=100',rotationZ:R(0,180),repeat:-1,yoyo:true,ease:Sine.easeInOut});
  TweenMax.to(elm,R(2,8),{rotationX:R(0,360),rotationY:R(0,360),repeat:-1,yoyo:true,ease:Sine.easeInOut,delay:-5});
};

function R(min,max) {return min+Math.random()*(max-min)};
