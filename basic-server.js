//basic-server.js

var request = require('request');
var q = require('q');
var _ = require('underscore');

var express = require('express');
var app = express();
var port = 8300;

app.get('/*', function(req,res){
   
    res.send('Its alive!');
    sendClue();
});

var server = app.listen(port, function(){
    console.log('Basic-server is listening on port '+port);
});

//Need to adjust this config setting to the file you create that holds your config values
//Alternatively, you can hardcode these values, but dont share them.
var config = require('./config.js');

var Twitter = require('twit');
var client = new Twitter({
    consumer_key:         config.twitter_consumer_key,
    consumer_secret:      config.twitter_consumer_secret,
    access_token:         config.twitter_access_token,
    access_token_secret:  config.twitter_access_token_secret
});

var Bitly = require('node-bitlyapi');
var bitly = new BitlyAPI({
    client_id: config.bitly_id,
    client_secret: config.bitly_secret
});

//
// filter the public stream by english tweets containing `#apple`
//
var stream = client.stream('user', { track: '@jservicebot' })

stream.on('tweet', function (tweet) {
  var screenName = tweet.user.screen_name;
  //We only want to respond when we are mentioned in a tweet.
  var mentions = tweet.entities.user_mentions;
  _.each(mentions, function(val, i){
    if(val.id === 2991209577){
        sendClue(screenName);
    }
  });
});


//Todo: make this return a valid bitly url
var makeUrl = function(clueId){
    var def = q.defer();
    bitly.shorten('http://jservice.io/clue/'+clueId, function(err, response) {
        if (err) console.log(err);
        
        var short_url = response.data.url
        //Uncomment to view raw bitly response. Useful for troubleshooting.
        //console.log('Shorturl: %j', response);
        def.resolve(short_url);
    });   
}


var getClue = function(){
    var defered = q.defer();
    request('http://jservice.io/api/random', function(err,resp,body){
        if(!err && resp.statusCode === 200){
            json = JSON.parse(body);
            defered.resolve(json[0]);
        }
    });   
    return defered.promise;
}

var sendClue = function(handle){
    var clue = getClue().then(function(myClue){
        var clueid = myClue.id;
        var answer = myClue.question;
        var category = myClue.category.title;
        var tweetText = '@'+handle+' '+category+': '+answer;
        if(tweetText.length < 140){
            console.log('makeUrl:' + clueid);
            makeUrl(clueid);
            //client.post('statuses/update', { status: tweetText }, function(err, data, response) {
            //    console.log(data)
            //    if(err) console.log(err)
            //})
        }else{
            //console.log('too long. trying again');
            sendClue(handle);   
        }
        //console.log('updating status');
        //console.log(tweetText);
    });
}


/*
getClue().then(function(data){
  console.log(data);  
})
*/