#include "pebble.h"
#include "marquee_text.h"
#include "progress_bar.h"

static Window *window;
static ActionBarLayer *action_bar;
static MarqueeTextLayer *title_layer;
static MarqueeTextLayer *album_layer;
static MarqueeTextLayer *artist_layer;
static BitmapLayer *album_art_layer;
static GBitmap album_art_bitmap;
static uint8_t album_art_data[512];
static ProgressBarLayer *progress_bar;

// Action bar icons
static GBitmap *icon_pause;
static GBitmap *icon_play;
static GBitmap *icon_fast_forward;
static GBitmap *icon_rewind;
static GBitmap *icon_volume_up;
static GBitmap *icon_volume_down;

static time_t last_updated;
static uint8_t last_track_progress;
static uint8_t volume;
static uint8_t muted;
static uint8_t _zoneid;

static AppSync sync;
static uint8_t sync_buffer[256];

enum ZoneMessageKey {

	ZONE_GROUP_NAME = 0x0,		//TUPLE_STRING
	ZONE_ALBUM = 0x1,			//TUPLE_STRING
	ZONE_ARTIST = 0x2,			//TUPLE_STRING
	ZONE_TITLE = 0x3, 			//TUPLE_STRING
	ZONE_DURATION = 0x4, 		//TUPLE_INT
	ZONE_CURRENT_TIME = 0x5, 	//TUPLE_INT
	ZONE_PLAY_STATE = 0x6, 		//TUPLE_INT 0:stopped, 1:playing, 2:paused	
	ZONE_VOLUME = 0x7, 			//TUPLE_INT 
	ZONE_MUTE = 0x8, 			//TUPLE_INT 1 = muted

	ZONE_ACTION = 0xa,			// TUPLE_INT 1:back, 2:next
	ZONE_INIT = 0xb
};

enum ZoneActionKey {
	ZACTION_INIT = 0x0,			// request a refresh
	ZACTION_BACK = 0x1,
	ZACTION_NEXT = 0x2,
};

//static void click_config_provider(ClickConfig **config, void *context);
static void click_config_provider(void* context);
static void window_unload(Window* window);
static void window_load(Window* window);
static void clicked_up(ClickRecognizerRef recognizer, void *context);
static void clicked_select(ClickRecognizerRef recognizer, void *context);
static void long_clicked_select(ClickRecognizerRef recognizer, void *context);
static void clicked_down(ClickRecognizerRef recognizer, void *context);
static void request_now_playing();
static void send_state_change(int8_t change);
static void request_zone_data();

static void display_no_album();

static bool controlling_volume = false;
static bool is_shown = false;
//static AppTimerHandle timer = 0;
static AppTimer *timer;

void show_zoneplayer(int zoneid) {
	_zoneid = zoneid;
	window = window_create();
    //window_init(window, sprintf("Zone %d", zoneid);	//TODO replace with name
    window_set_window_handlers(window, (WindowHandlers){
        .unload = window_unload,
        .load = window_load,
    });
    window_stack_push(window, true);
}


void now_playing_tick() {
	uint8_t progress = last_track_progress + (time(NULL)-last_updated);
    progress_bar_layer_set_value(progress_bar, progress);
}

void now_playing_animation_tick() {
    if(!is_shown) return;
    now_playing_tick();
    timer = app_timer_register(1000, now_playing_animation_tick, NULL);
}


static void in_dropped_handler(AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "App Message Dropped!");
}

static void out_failed_handler(DictionaryIterator *failed, AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "App Message Failed to Send!");
}

static void app_message_init(void) {
  // Register message handlers
  //app_message_register_inbox_received(in_received_handler);
  app_message_register_inbox_dropped(in_dropped_handler);
  app_message_register_outbox_failed(out_failed_handler);
  // Init buffers
  app_message_open(256, 256);
}


static void sync_error_callback(DictionaryResult dict_error, AppMessageResult app_message_error, void *context) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "App Message Sync Error: %d", app_message_error);
}

static void sync_tuple_changed_callback(const uint32_t key, const Tuple* new_tuple, const Tuple* old_tuple, void* context) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "App Message Sync sync_tuple_changed_callback");
  if (!is_shown) return;
	uint8_t state;
	
	switch (key) {
    case ZONE_GROUP_NAME:
		APP_LOG(APP_LOG_LEVEL_DEBUG, "ZONE_GROUP_NAME");
      break;

    case ZONE_ALBUM:
		APP_LOG(APP_LOG_LEVEL_DEBUG, "ZONE_ALBUM:%s", new_tuple->value->cstring);
      // App Sync keeps new_tuple in sync_buffer, so we may use it directly
      marquee_text_layer_set_text(album_layer, new_tuple->value->cstring);
      break;

    case ZONE_ARTIST:
		APP_LOG(APP_LOG_LEVEL_DEBUG, "ZONE_ARTIST:%s", new_tuple->value->cstring);
      marquee_text_layer_set_text(artist_layer, new_tuple->value->cstring);
      break;

    case ZONE_TITLE:
		APP_LOG(APP_LOG_LEVEL_DEBUG, "ZONE_TITLE:%s", new_tuple->value->cstring);
      marquee_text_layer_set_text(title_layer, new_tuple->value->cstring);
      break;	
	
    case ZONE_DURATION:
		APP_LOG(APP_LOG_LEVEL_DEBUG, "ZONE_DURATION:%d", new_tuple->value->uint8);
      progress_bar_layer_set_range(progress_bar, 0, new_tuple->value->uint8);
      break;	

    case ZONE_CURRENT_TIME:
		last_track_progress = new_tuple->value->uint8;
		APP_LOG(APP_LOG_LEVEL_DEBUG, "ZONE_CURRENT_TIME:%d", last_track_progress);
		progress_bar_layer_set_value(progress_bar, last_track_progress);
	  last_updated = time(NULL);
      break;	
		
    case ZONE_PLAY_STATE:
		state = new_tuple->value->uint8;
		APP_LOG(APP_LOG_LEVEL_DEBUG, "ZONE_PLAY_STATE:%d", state);
      if (state != 1) // not playing
	  {
		   action_bar_layer_set_icon(action_bar, BUTTON_ID_SELECT, icon_play);
	  }
		else
		{
			action_bar_layer_set_icon(action_bar, BUTTON_ID_SELECT, icon_pause);
		}
		
      break;			

	 case ZONE_VOLUME:
		APP_LOG(APP_LOG_LEVEL_DEBUG, "ZONE_VOLUME:%d", new_tuple->value->uint8);
      	volume = new_tuple->value->uint8;
      break;	


	 case ZONE_MUTE:
		APP_LOG(APP_LOG_LEVEL_DEBUG, "ZONE_MUTE:%d", new_tuple->value->uint8);
      	muted = new_tuple->value->uint8;
      break;			
		
  }
}

static void window_load(Window* window) {
    // Load bitmaps for action bar icons.
	
    icon_pause =  gbitmap_create_with_resource(RESOURCE_ID_ICON_PAUSE);
    icon_play =  gbitmap_create_with_resource(RESOURCE_ID_ICON_PLAY);
    icon_fast_forward =  gbitmap_create_with_resource(RESOURCE_ID_ICON_FAST_FORWARD);
    icon_rewind =  gbitmap_create_with_resource(RESOURCE_ID_ICON_REWIND);
    icon_volume_up =  gbitmap_create_with_resource(RESOURCE_ID_ICON_VOLUME_UP);
    icon_volume_down =  gbitmap_create_with_resource( RESOURCE_ID_ICON_VOLUME_DOWN);
    
	// Action bar
    action_bar = action_bar_layer_create();
    action_bar_layer_add_to_window(action_bar, window);
    action_bar_layer_set_click_config_provider(action_bar, click_config_provider);
    controlling_volume = false;
	
    // Set default icon set.
    action_bar_layer_set_icon(action_bar, BUTTON_ID_DOWN, icon_fast_forward);
    action_bar_layer_set_icon(action_bar, BUTTON_ID_UP, icon_rewind);
    action_bar_layer_set_icon(action_bar, BUTTON_ID_SELECT, icon_play);
    
    // Text labels
    title_layer = marquee_text_layer_create(GRect(2, 0, 118, 35));
    marquee_text_layer_set_font(title_layer, fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD));
    marquee_text_layer_set_text(title_layer, "Loading title..");
	
    album_layer = marquee_text_layer_create(GRect(2, 130, 118, 23));
    marquee_text_layer_set_font(album_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD));
    marquee_text_layer_set_text(album_layer, "Loading album..");
    
	artist_layer = marquee_text_layer_create(GRect(2, 107, 118, 28));
    marquee_text_layer_set_font(artist_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24));
    marquee_text_layer_set_text(artist_layer, "Loading artist..");
    
    layer_add_child(window_get_root_layer(window), title_layer);
    layer_add_child(window_get_root_layer(window), album_layer);
    layer_add_child(window_get_root_layer(window), artist_layer);
    
    // Progress bar
	progress_bar = progress_bar_layer_create(GRect(10, 105, 104, 7));
    layer_add_child(window_get_root_layer(window), progress_bar);
    
    
	/*// Album art
    album_art_bitmap = (GBitmap) {
        .addr = album_art_data,
        .bounds = GRect(0, 0, 64, 64),
        .info_flags = 1,
        .row_size_bytes = 8,
    };
	
    //memset(album_art_data, 0, 512);
	album_art_layer = bitmap_layer_create(GRect(30, 35, 64, 64));
    bitmap_layer_set_bitmap(album_art_layer, &album_art_bitmap);
    layer_add_child(window_get_root_layer(window), album_art_layer);
    display_no_album();
    
    app_callbacks = (AppMessageCallbacksNode){
        .callbacks = {
            .in_received = app_in_received,
        }
    };
    app_message_register_callbacks(&app_callbacks);
    ipod_state_set_callback(state_callback);
    request_now_playing();
	*/
	
	// Start App Sync
	app_message_init();
	
	Tuplet initial_values[] = {
		TupletCString(ZONE_GROUP_NAME, "Loading Zone"),
		TupletCString(ZONE_ALBUM, "Loading Album"),
		TupletCString(ZONE_ARTIST, "Loading Artist"),
		TupletCString(ZONE_TITLE, "Loading Title"),
		TupletInteger(ZONE_DURATION, (uint8_t) 100),
		TupletInteger(ZONE_CURRENT_TIME, (uint8_t) 50),
		TupletInteger(ZONE_PLAY_STATE, (uint8_t) 0), //0:stopped, 1:playing, 2:paused
		TupletInteger(ZONE_VOLUME, (uint8_t) 0), //
		TupletInteger(ZONE_MUTE, (uint8_t) 0), //0 = normal, 1 = muted
	  };

  app_sync_init(&sync, sync_buffer, sizeof(sync_buffer), initial_values, ARRAY_LENGTH(initial_values),
      sync_tuple_changed_callback, sync_error_callback, NULL);	
	
	request_zone_data(); // request an initial data pump for this zone
	
	
    is_shown = true;
	
	timer = app_timer_register(1000, now_playing_animation_tick, NULL);
	
}



static void window_unload(Window* window) {
	
    action_bar_layer_remove_from_window(action_bar);
    marquee_text_layer_destroy(title_layer);
	marquee_text_layer_destroy(album_layer);
	marquee_text_layer_destroy(artist_layer);

	progress_bar_layer_destroy(progress_bar);
 //   app_message_deregister_callbacks(&app_callbacks);
    
    // deinit action bar icons
	
    gbitmap_destroy(icon_pause);
	gbitmap_destroy(icon_play);
	gbitmap_destroy(icon_fast_forward);
	gbitmap_destroy(icon_rewind);
	gbitmap_destroy(icon_volume_up);
	gbitmap_destroy(icon_volume_down);
    
	app_sync_deinit(&sync);
	
    is_shown = false;
}




static void click_config_provider(void* context) {
  const uint16_t repeat_interval_ms = 100;
  window_set_click_context(BUTTON_ID_UP, context);
  window_single_repeating_click_subscribe(BUTTON_ID_UP, repeat_interval_ms, clicked_up);

  window_set_click_context(BUTTON_ID_SELECT, context);
  window_single_click_subscribe(BUTTON_ID_SELECT, clicked_select);
  window_long_click_subscribe(BUTTON_ID_SELECT, 0, long_clicked_select, NULL);
	

  window_set_click_context(BUTTON_ID_DOWN, context);
  window_single_repeating_click_subscribe(BUTTON_ID_DOWN, repeat_interval_ms, clicked_down);
}

/*
static void click_config_provider(ClickConfig **config, void* context) {
    config[BUTTON_ID_DOWN]->click.handler = clicked_down;
    config[BUTTON_ID_UP]->click.handler = clicked_up;
    config[BUTTON_ID_SELECT]->click.handler = clicked_select;
    config[BUTTON_ID_SELECT]->long_click.handler = long_clicked_select;
}
*/


static void send_sync_change(int8_t state) {
	
	if (state == 64) {// volume up
		
		if (volume < 100) volume++;
		Tuplet changed_values[] = {
		TupletInteger(ZONE_VOLUME, (uint8_t) volume), 
	  };
		app_sync_set(&sync, changed_values, ARRAY_LENGTH(changed_values));
	}
	
	if (state == -64) {// volume down
		if (volume > 0) volume--;
		Tuplet changed_values[] = {
		TupletInteger(ZONE_VOLUME, (uint8_t) volume), // deal with invalid values on the other side
	  };
		app_sync_set(&sync, changed_values, ARRAY_LENGTH(changed_values));
	}

	if (state == 0) {// play/pause
		if (state != 1) state = 1; else state = 2; // if not playing, make playing
		Tuplet changed_values[] = {
		   TupletInteger(ZONE_PLAY_STATE, state) //0:stopped, 1:playing, 2:paused			
	  };
		app_sync_set(&sync, changed_values, ARRAY_LENGTH(changed_values));
	}	
	
	
}



static void request_zone_data() {
	
  Tuplet value = TupletInteger(ZONE_INIT, _zoneid);

  DictionaryIterator *iter;
  app_message_outbox_begin(&iter);

  if (iter == NULL) {
	  APP_LOG(APP_LOG_LEVEL_DEBUG, "No iterator in send_state_change!");
    return;
  }

  dict_write_tuplet(iter, &value);
  dict_write_end(iter);

  app_message_outbox_send();

}

static void send_action(int8_t action) {
	
  Tuplet value = TupletInteger(ZONE_ACTION, action);

  DictionaryIterator *iter;
  app_message_outbox_begin(&iter);

  if (iter == NULL) {
	  APP_LOG(APP_LOG_LEVEL_DEBUG, "No iterator in send_state_change!");
    return;
  }

  dict_write_tuplet(iter, &value);
  dict_write_end(iter);

  app_message_outbox_send();

}

static void send_state_change(int8_t state) {
	
	send_sync_change(state);
		/*
  Tuplet value = TupletInteger(1, state);

  DictionaryIterator *iter;
  app_message_outbox_begin(&iter);

  if (iter == NULL) {
	  APP_LOG(APP_LOG_LEVEL_DEBUG, "No iterator in send_state_change!");
    return;
  }

  dict_write_tuplet(iter, &value);
  dict_write_end(iter);

  app_message_outbox_send();
  */
}

static void clicked_up(ClickRecognizerRef recognizer, void *context) {
    if(!controlling_volume) {
		send_action(ZACTION_BACK); // back
        //send_state_change(-1);
    } else {
        send_state_change(64);
    }
}
static void clicked_select(ClickRecognizerRef recognizer, void *context) {
    send_state_change(0);
}
static void clicked_down(ClickRecognizerRef recognizer, void *context) {
    if(!controlling_volume) {
        //send_state_change(1);
		send_action(ZACTION_NEXT); // next
    } else {
        send_state_change(-64);
    }
}

static void long_clicked_select(ClickRecognizerRef recognizer, void *context) {
    controlling_volume = !controlling_volume;
    if(controlling_volume) {
        action_bar_layer_set_icon(action_bar, BUTTON_ID_UP, icon_volume_up);
        action_bar_layer_set_icon(action_bar, BUTTON_ID_DOWN, icon_volume_down);
    } else {
        action_bar_layer_set_icon(action_bar, BUTTON_ID_DOWN, icon_fast_forward);
        action_bar_layer_set_icon(action_bar, BUTTON_ID_UP, icon_rewind);
    }
}

/*
static void display_no_album() {
    resource_load(resource_get_handle(RESOURCE_ID_ALBUM_ART_MISSING), album_art_data, 512);
    layer_mark_dirty(album_art_layer);
}
*/
