#include "zonemenu.h"
#include "zoneplayer.h"
#include <pebble.h>
	
static void open_zone1(int index, void* context);
static void open_zone2(int index, void* context);
static void open_zone3(int index, void* context);
static void pause_all(int index, void* context);
static void show_zone(int index);

static SimpleMenuItem zone_menu_items[] = {
    {
        .title = "Kitchen",
        .callback = open_zone1,
    },
    {
        .title = "Living Room",
        .callback = open_zone2,
    },
    {
        .title = "Family Room",
        .callback = open_zone3,
    },
    {
        .title = "Pause All",
        .callback = pause_all,
    },		
};

static SimpleMenuSection section = {
    .items = zone_menu_items,
    .num_items = ARRAY_LENGTH(zone_menu_items),
};

//static SimpleMenuLayer* zone_menu_layer;


SimpleMenuLayer* zone_menu_create(Window* window) {
    return simple_menu_layer_create(GRect(0, 0, 144, 152), window, &section, 1, NULL);
    //layer_add_child(window_get_root_layer(window), simple_menu_layer_get_layer(zone_menu_layer));
}

static void open_zone1(int index, void* context) {
    show_zoneplayer(1);
}
static void open_zone2(int index, void* context) {
    show_zoneplayer(2);
}
static void open_zone3(int index, void* context) {
    show_zoneplayer(3);
}

static void pause_all(int index, void* context) {
    return; //TODO: implement
}


