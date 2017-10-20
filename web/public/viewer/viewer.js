
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
  handleOverlays(overlays);
  handleEmoticons(overlays);
  handlePictureInPicture(overlays);
}

function handleOverlays(overlays){
  if(overlays.overlay1.show){
    $(".overlay-1").fadeIn(500);
  }else{
    $(".overlay-1").fadeOut(500);
  }
  $(".overlay-1-content").html(overlays.overlay1.message);
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
    var pip = $(".frame2");
    pip.fadeIn(500);
    pip.css({top: overlays.pip.position.top, left: overlays.pip.position.left});
  }else{
    $(".frame2").fadeOut(500);
  }

}
