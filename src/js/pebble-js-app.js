
Pebble.addEventListener("ready",
                        function(e) {
                          console.log("in ready event! ready = " + e.ready);
                          console.log("e.type = " + e.type);
                        });

Pebble.addEventListener("appmessage",
                        function(e) {
						  console.log("appmessage handler...");
						  console.log("e.type = " + e.type);
                          console.log("e.payload.temperature = " + e.payload.temperature);
                        });


Pebble.addEventListener("webviewclosed",
                                     function(e) {
                                     console.log("webview closed");
                                     console.log(e.type);
                                     console.log(e.response);
                                     });
