#include <pebble.h>
#include "zonemenu.h"
	
Window *my_window;
SimpleMenuLayer *zone_menu;

void handle_init(void) {
	  my_window = window_create();
	  zone_menu = zone_menu_create(my_window);
	  layer_add_child(window_get_root_layer(my_window), simple_menu_layer_get_layer(zone_menu));
	  //text_layer = text_layer_create(GRect(0, 0, 144, 20));
	
	  window_stack_push(my_window, true /* Animated */);
}




void handle_deinit(void) {
	  //text_layer_destroy(text_layer);
	  simple_menu_layer_destroy(zone_menu);
	  window_destroy(my_window);
}

int main(void) {
	  handle_init();
	  app_event_loop();
	  handle_deinit();
}
