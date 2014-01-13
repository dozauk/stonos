#include "pebble.h"

typedef Layer ProgressBarLayer;
	
typedef struct {
    int32_t min;
    int32_t max;
    int32_t value;
    GColor bar_colour;
    GColor background_colour;
    GColor frame_colour;
} ProgressBarData;

ProgressBarLayer* progress_bar_layer_create(GRect frame);
void progress_bar_layer_destroy(ProgressBarLayer* bar);
void progress_bar_layer_set_range(ProgressBarLayer* bar, int32_t min, int32_t max);
void progress_bar_layer_set_value(ProgressBarLayer* bar, int32_t value);
