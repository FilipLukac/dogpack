var debugmode = false;
var sounds = false;
var dialogOpened = true;

var states = Object.freeze({
   SplashScreen: 0,
   GameScreen: 1,
   ScoreScreen: 2
});

var currentstate;

var gravity = 0.25;
var velocity = 0;
var position = 180;
var rotation = 0;
var jump = -4.6;

var score = 0;
var highscore = 0;

var pipes = [];
var catchers = [];
var shields = [];
var scoreTime = 0;

var replayclickable = false;
var shieldActivated = false;
var turboActivated = false;


//sounds
var volume = 30;
var soundJump = new buzz.sound("assets/sounds/rocket.ogg");
var soundScore = new buzz.sound("assets/sounds/sfx_point.ogg");
var soundHit = new buzz.sound("assets/sounds/sfx_hit.ogg");
var soundDie = new buzz.sound("assets/sounds/sfx_die.ogg");
var soundSwoosh = new buzz.sound("assets/sounds/sfx_swooshing.ogg");
buzz.all().setVolume(volume);


var fuel = $('#fuel');

var overalWidth = fuel.width();
var halfHeight = overalWidth * 0.5;
var minimumHeight = overalWidth * 0.20;
var fuelToDown = fuel.width() * 0.03;

//loops
var loopGameloop;
var loopPipeloop;
var loopFuel;
var loopCatchers;
var loopShields;


$(document).ready(function() {
   if(window.location.search == "?debug")
      debugmode = true;
   
   //get the highscore
   var savedscore = getCookie("highscore");
   if(savedscore != "")
      highscore = parseInt(savedscore);

   var s = getCookie('sounds');
   if (s != "") {
      if (s == 'false') {
         sounds = false;
      } else {
         sounds = true;
      }
   } else {
      setCookie('sounds', true);
   }

   if (!sounds) {
      $('#sound-on').hide();
      $('#sound-off').show();
   } else {
      $('#sound-on').show();
      $('#sound-off').hide();
   }

   var nick = getCookie('nickname');
   if (!nick || nick == 'anonymous') {
      $( "#dialog" ).dialog({
         dialogClass: "no-close",
         buttons: [
            {
               text: "Save",
               click: function() {
                  var nick = $('#nickname').val();
                  if (nick == "") {
                     setCookie('nickname', "Anonymous");
                     dialogOpened = false;
                     $( this ).dialog( "close" );
                  } else {
                     setCookie('nickname', nick);
                     dialogOpened = false;
                     $( this ).dialog( "close" );
                  }

               }
            }
         ]
      });
      dialogOpened = true;
   } else {
      dialogOpened = false;
   }

   //start with the splash screen
   showSplash();


   function getCookie(cname)
   {
      var name = cname + "=";
      var ca = document.cookie.split(';');
      for(var i=0; i<ca.length; i++)
      {
         var c = ca[i].trim();
         if (c.indexOf(name)==0) return c.substring(name.length,c.length);
      }
      return "";
   }

   function setCookie(cname,cvalue,exdays)
   {
      var d = new Date();
      d.setTime(d.getTime()+(exdays*24*60*60*1000));
      var expires = "expires="+d.toGMTString();
      document.cookie = cname + "=" + cvalue + "; " + expires;
   }

   function showSplash()
   {
      currentstate = states.SplashScreen;

      //set the defaults (again)
      velocity = 0;
      position = 180;
      rotation = 0;
      score = 0;

      //update the player in preparation for the next game
      $("#player").css({ y: 0, x: 0});
      updatePlayer($("#player"));

      if (sounds) {
         soundSwoosh.stop();
         soundSwoosh.play();
      }


      //clear out all the pipes if there are any
      $(".fuel").remove();
      $(".catch").remove();
      pipes = [];
      catchers = [];

      //make everything animated again
      $(".animated").css('animation-play-state', 'running');
      $(".animated").css('-webkit-animation-play-state', 'running');

      //fade in the splash
      $("#splash").transition({ opacity: 1 }, 2000, 'ease');
   }



   function startGame()
   {
      fuel.css('background-color', '#18f669');
      fuel.width(overalWidth);
      currentstate = states.GameScreen;

      var shields = $('.shield-dog');

      for (var i = shields.length; i < 3; i++) {
         var newShield = $('<img src="assets/shield-up.png" class="shield-dog" width="25" style="margin-left: 5px;" />');
         $('#shield-handler').append(newShield);
      }


      //fade out the splash
      $("#splash").stop();
      $("#splash").transition({ opacity: 0 }, 500, 'ease');

      //update the big score
      setBigScore();

      //debug mode?
      if(debugmode)
      {
         //show the bounding boxes
         $(".boundingbox").show();
      }

      //start up our loops
      var updaterate = 1000.0 / 60.0 ; //60 times a second
      loopGameloop = setInterval(gameloop, updaterate);
      loopPipeloop = setInterval(updatePipes, 3000);
      loopCatchers = setInterval(updateCatchers, 2000);
      loopFuel = setInterval(updateFuel, 1000);
      loopShields = setInterval(updateShields, 30000);


      //jump from the start!
      playerJump();
      setInterval(function () {
         scoreTime++;
      }, 1000);
   }

   function updatePlayer(player)
   {
      //rotation
      rotation = Math.min((velocity / 35) * 90, 90);
      //apply rotation and position
      $(player).css({ rotate: rotation, top: position });
   }

   function activateTurbo()
   {
      turboActivated = true;
      var fuel = $('.fuel');
      var cat = $('.catch');

      fuel.css('-webkit-animation','animPipe 1000ms linear');
      cat.css('-webkit-animation','animPipe 100ms linear');
      fuel.css('animation', 'animPipe 100ms linear');
      cat.css('animation','animPipe 100ms linear');

      setTimeout(function () {
         fuel.css('-webkit-animation','animPipe 7500ms linear');
         cat.css('-webkit-animation','animPipe 7500ms linear');
         fuel.css('animation', 'animPipe 7500ms linear');
         cat.css('animation','animPipe 7500ms linear');
         turboActivated = false;
      }, 3000);
   }


   function gameloop() {
      var player = $("#player");

      //update the player speed/position
      velocity += gravity;
      position += velocity;

      //update the player
      updatePlayer(player);

      //create the bounding box
      var box = document.getElementById('player').getBoundingClientRect();
      var origwidth = 110.0;
      var origheight = 81.0;

      var boxwidth = origwidth - (Math.sin(Math.abs(rotation) / 90) * 8);
      var boxheight = (origheight + box.height) / 2;
      var boxleft = ((box.width - boxwidth) / 2) + box.left;
      var boxtop = ((box.height - boxheight) / 2) + box.top;

      //if we're in debug mode, draw the bounding box
      if(debugmode)
      {
         var boundingbox = $("#playerbox");
         boundingbox.css('left', boxleft);
         boundingbox.css('top', boxtop);
         boundingbox.css('height', boxheight);
         boundingbox.css('width', boxwidth);
      }

      if (shieldActivated) {
         var boundingbox = $("#playershield");
         boundingbox.show();
         boundingbox.css('left', boxleft-4);
         boundingbox.css('top', boxtop+4);
         boundingbox.css('height', boxheight+4);
         boundingbox.css('width', boxwidth+4);
      }

      //did we hit the ground?
      if(box.bottom >= $("#land").offset().top)
      {
         playerDead();
      }

      if (fuel.width() <= 0) {
         playerDead();
      }

      if (pipes.length > 0) {
         for (var i in pipes) {
            var pipe = pipes[i];
            if (typeof pipe[0] !== 'undefined') {
               var pipebox = pipe[0].getBoundingClientRect();
               if (intersect(box, pipebox)) {
                  var pipeId = pipe.attr('pipe-id');
                  pipe.remove();
                  playerScore();
                  fuelUp();
               }
            }
         }
      }

      if (catchers.length > 0) {
         for (var i in catchers) {
            var catcher = catchers[i];
            if (typeof catcher[0] !== 'undefined') {
               var catcherBox = catcher[0].getBoundingClientRect();
               if (intersect(catcherBox, box) && !shieldActivated) {
                  playerDead();
               }

               if (intersect(catcherBox, box) && shieldActivated) {
                  catcher.remove();
               }
            }
         }
      }


      if (shields.length > 0) {
         for (var i in shields) {
            var shield = shields[i];
            if (typeof shield[0] !== 'undefined') {
               var shieldBox = shield[0].getBoundingClientRect();

               if (intersect(shieldBox, box)) {
                  updateShield();
                  shield.remove();

               }
            }
         }
      }
   }

   function updateShield()
   {
      var newShield = $('<img src="assets/shield-up.png" class="shield-dog" width="25" style="margin-left: 5px;" />');
      $('#shield-handler').append(newShield);
   }

   function activateShield()
   {
      var shields = $('.shield-dog');

      if (typeof shields !== "undefined" && shields.length && shields.length > 0) {
         shields[shields.length-1].remove();

         var box = document.getElementById('player').getBoundingClientRect();
         var origwidth = 110.0;
         var origheight = 81.0;

         var boxwidth = origwidth - (Math.sin(Math.abs(rotation) / 90) * 8);
         var boxheight = (origheight + box.height) / 2;
         var boxleft = ((box.width - boxwidth) / 2) + box.left;
         var boxtop = ((box.height - boxheight) / 2) + box.top;


         var boundingbox = $("#playershield");
         boundingbox.show();
         boundingbox.css('left', boxleft-4);
         boundingbox.css('top', boxtop+4);
         boundingbox.css('height', boxheight+4);
         boundingbox.css('width', boxwidth+4);
         shieldActivated = true;

         setTimeout(function () {
            boundingbox.hide();
            shieldActivated = false;
         }, 5000)
      }
   }


   function fuelUp()
   {
      var widthToAdd = fuel.width() + overalWidth * 0.1;

      if (widthToAdd >= overalWidth) {
         fuel.width(overalWidth);
      } else {
         fuel.width(widthToAdd);
      }
   }

   function intersect(r1, r2)
   {
      return !(r2.left > r1.right ||
      r2.right < r1.left ||
      r2.top > r1.bottom ||
      r2.bottom < r1.top);
   }

//Handle space bar
   $(document).keydown(function(e){

      if (!dialogOpened) {
         if (e.keyCode == 66) {
            activateShield();
         }

         if (e.keyCode == 67) {
            activateTurbo();
         }

         //space bar!
         if(e.keyCode == 32)
         {
            //in ScoreScreen, hitting space should click the "replay" button. else it's just a regular spacebar hit
            if(currentstate == states.ScoreScreen)
               $("#replay").click();
            else
               screenClick();
         }
      }

   });

//Handle mouse down OR touch start
   if("ontouchstart" in window) {
      if (!dialogOpened) {
         $(document).on("touchstart", screenClick);
      }
   }
   else {
      if (!dialogOpened) {
         $(document).on("mousedown", screenClick);
      }
   }

   function screenClick()
   {
      if(currentstate == states.GameScreen)
      {
         playerJump();
      }
      else if(currentstate == states.SplashScreen)
      {
         startGame();
      }
   }

   function playerJump()
   {
      velocity = jump;
      if (sounds) {
         soundJump.stop();
         soundJump.play();
      }
   }

   function setBigScore(erase)
   {
      var elemscore = $("#bigscore");
      elemscore.empty();

      if(erase)
         return;

      var digits = score.toString().split('');
      for(var i = 0; i < digits.length; i++)
         elemscore.append("<img src='assets/font_big_" + digits[i] + ".png' alt='" + digits[i] + "'>");
   }

   function setSmallScore()
   {
      var elemscore = $("#currentscore");
      elemscore.empty();

      var digits = score.toString().split('');
      for(var i = 0; i < digits.length; i++)
         elemscore.append("<img src='assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
   }

   function setHighScore()
   {
      var elemscore = $("#highscore");
      elemscore.empty();

      var digits = highscore.toString().split('');
      for(var i = 0; i < digits.length; i++)
         elemscore.append("<img src='assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
   }


   function playerDead()
   {
      pipes = [];
      catchers = [];
      //stop animating everything!
      $(".animated").css('animation-play-state', 'paused');
      $(".animated").css('-webkit-animation-play-state', 'paused');

      //drop the bird to the floor
      var playerbottom = $("#player").position().top + $("#player").width(); //we use width because he'll be rotated 90 deg
      var floor = $("#flyarea").height();
      var movey = Math.max(0, floor - playerbottom);
      $("#player").transition({ y: movey + 'px', rotate: 90}, 1000, 'easeInOutCubic');

      //it's time to change states. as of now we're considered ScoreScreen to disable left click/flying
      currentstate = states.ScoreScreen;

      //destroy our gameloops
      clearInterval(loopGameloop);
      clearInterval(loopPipeloop);
      clearInterval(loopFuel);
      clearInterval(loopCatchers);
      clearInterval(loopShields)

      loopGameloop = null;
      loopPipeloop = null;
      loopCatchers = null;
      loopFuel = null;
      loopShields = null;

      score *= Math.floor(scoreTime/2);

      //mobile browsers don't support buzz bindOnce event
      if(isIncompatible.any())
      {
         //skip right to showing score
         showScore();
      }
      else
      {
         if (sounds) {
            //play the hit sound (then the dead sound) and then show score
            soundHit.play().bindOnce("ended", function() {
               soundDie.play().bindOnce("ended", function() {
                  showScore();
               });
            });
         } else {
            showScore();
         }
      }
      return;
   }

   function showScore()
   {
      //unhide us
      $("#scoreboard").css("display", "block");

      //remove the big score
      setBigScore(true);

      //have they beaten their high score?
      if(score > highscore)
      {
         //yeah!
         highscore = score;
         //save it!
         setCookie("highscore", highscore, 999);
      }

      //update the scoreboard
      setSmallScore();
      setHighScore();

      //SWOOSH!
      if (sounds) {
         soundSwoosh.stop();
         soundSwoosh.play();
      }

      //show the scoreboard
      $("#scoreboard").css({ y: '40px', opacity: 0 }); //move it down so we can slide it up
      $("#replay").css({ y: '40px', opacity: 0 });
      $("#scoreboard").transition({ y: '0px', opacity: 1}, 600, 'ease', function() {
         //When the animation is done, animate in the replay button and SWOOSH!
         if (sounds) {
            soundSwoosh.stop();
            soundSwoosh.play();
         }
         $("#replay").transition({ y: '0px', opacity: 1}, 600, 'ease');
      });

      //make the replay button clickable
      replayclickable = true;
   }

   $("#replay").click(function() {
      //make sure we can only click once
      if(!replayclickable)
         return;
      else
         replayclickable = false;

      //SWOOSH!
      if (sounds) {
         soundSwoosh.stop();
         soundSwoosh.play();
      }


      //fade out the scoreboard
      $("#scoreboard").transition({ y: '-40px', opacity: 0}, 1000, 'ease', function() {
         //when that's done, display us back to nothing
         $("#scoreboard").css("display", "none");

         //start the game over!
         showSplash();
      });
   });

   var countPipes = 0;

   function updatePipes()
   {
      //Do any pipes need removal?
      $(".fuel").filter(function() {
         return $(this).position().left <= -150;
      }).each(function () {
         var pipe = $(this);
         pipes.splice(pipe.attr('pipe-id')-pipes.length,1);
         pipe.remove();
      });


      var areaHeight = $('#flyarea').height();
      var halfHeight = areaHeight / 2;

      var random = Math.floor(Math.random() * areaHeight) + 1;

      if (random >= halfHeight) {
         random -= $('#land').height();
         random -= 50;
      } else {
         random += $('#fuel').height() + 30;
      }

      var newpipe = $('<div class="fuel animated" id="pipe-'+ countPipes++ +'" pipe-id="' + pipes.length +'" style="top: ' + random +'px;"></div>');
      $("#flyarea").append(newpipe);
      pipes.push(newpipe);
   }


   var countCatches = 0;


   function updateCatchers()
   {
      //Do any pipes need removal?
      $(".catch").filter(function() {
         return $(this).position().left <= -150;
      }).each(function () {
         var pipe = $(this);
         catchers.splice(pipe.attr('catch-id')-pipes.length,1);
         pipe.remove();
      });


      var areaHeight = $('#flyarea').height();
      var halfHeight = areaHeight / 2;

      var random = Math.floor(Math.random() * areaHeight) + 1;

      if (random >= halfHeight) {
         random -= $('#land').height();
         random -= 50;
      } else {
         random += $('#fuel').height() + 30;
      }

      var newCatcher = $('<div class="catch animated" id="catch-'+ countCatches++ +'" catch-id="' + catchers.length +'" style="top: ' + random +'px;"></div>');
      $("#flyarea").append(newCatcher);
      catchers.push(newCatcher);
   }

   var countShields = 0

   function updateShields()
   {
      //Do any pipes need removal?
      $(".shield-up").filter(function() {
         return $(this).position().left <= -150;
      }).each(function () {
         var pipe = $(this);
         shields.splice(pipe.attr('shield-id')-pipes.length,1);
         pipe.remove();
      });


      var areaHeight = $('#flyarea').height();
      var halfHeight = areaHeight / 2;

      var random = Math.floor(Math.random() * areaHeight) + 1;

      if (random >= halfHeight) {
         random -= $('#land').height();
         random -= 50;
      } else {
         random += $('#fuel').height() + 30;
      }

      var newShield = $('<div class="shield-up animated" id="shield-'+ countShields++ +'" pipe-id="' + shields.length +'" style="top: ' + random +'px;"></div>');
      $("#flyarea").append(newShield);
      shields.push(newShield);
   }


   function updateFuel()
   {
      fuel.width(fuel.width() - fuelToDown);

      if (fuel.width() >= halfHeight) {
         fuel.css('background-color', '#18f669');
      }

      if (fuel.width() <= halfHeight) {
         fuel.css('background-color', '#f6f64d');
      }

      if (fuel.width() <= minimumHeight) {
         fuel.css('background-color', 'red');
      }
   }


   function playerScore()
   {
      score += 1;
      if (sounds) {
         //play score sound
         soundScore.stop();
         soundScore.play();
      }
      setBigScore();
   }


   var isIncompatible = {
      Android: function() {
         return navigator.userAgent.match(/Android/i);
      },
      BlackBerry: function() {
         return navigator.userAgent.match(/BlackBerry/i);
      },
      iOS: function() {
         return navigator.userAgent.match(/iPhone|iPad|iPod/i);
      },
      Opera: function() {
         return navigator.userAgent.match(/Opera Mini/i);
      },
      Safari: function() {
         return (navigator.userAgent.match(/OS X.*Safari/) && ! navigator.userAgent.match(/Chrome/));
      },
      Windows: function() {
         return navigator.userAgent.match(/IEMobile/i);
      },
      any: function() {
         return (isIncompatible.Android() || isIncompatible.BlackBerry() || isIncompatible.iOS() || isIncompatible.Opera() || isIncompatible.Safari() || isIncompatible.Windows());
      }
   };

   $('.sound-option').click(function(){
      var option = $(this).attr('attr');
      console.log(option);
      if (option == 'on') {
         sounds = false;
         setCookie('sounds', false);
         $('#sound-on').hide();
         $('#sound-off').show();
      } else {
         sounds = true;
         setCookie('sounds', true);
         $('#sound-on').show();
         $('#sound-off').hide();
      }
   });
});
