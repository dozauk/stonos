#include "progress_bar.h"

static void update_proc(Layer* layer, GContext *context);

ProgressBarLayer* progress_bar_layer_create(GRect frame) {
    
	ProgressBarLayer *bar = layer_create_with_data(frame, sizeof(ProgressBarData));
	ProgressBarData *progressdata = (ProgressBarData *)layer_get_data(bar);

	layer_set_update_proc(bar, update_proc);

    progressdata->min = 0;
    progressdata->max = 255;
    progressdata->value = 0;
    progressdata->background_colour = GColorWhite;
    progressdata->frame_colour = GColorBlack;
    progressdata->bar_colour = GColorBlack;
	
	return bar;
}

void progress_bar_layer_set_range(ProgressBarLayer* bar, int32_t min, int32_t max) {
	ProgressBarData *progressdata = (ProgressBarData *)layer_get_data(bar);
    progressdata->max = max;
    progressdata->min = min;
    layer_mark_dirty(bar);
}

void progress_bar_layer_set_value(ProgressBarLayer* bar, int32_t value) {
	ProgressBarData *progressdata = (ProgressBarData *)layer_get_data(bar);
    progressdata->value = value;
    layer_mark_dirty(bar);
}

static void update_proc(ProgressBarLayer* bar, GContext *context) {
	ProgressBarData *progressdata = (ProgressBarData *)layer_get_data(bar);
	
    GRect bounds = layer_get_bounds(bar);
    // graphics_draw_rect doesn't actually exist, so we use this hack instead.
    graphics_context_set_fill_color(context, progressdata->frame_colour);
    graphics_fill_rect(context, bounds, 3, GCornersAll);
    bounds.origin.x += 1;
    bounds.origin.y += 1;
    bounds.size.w -= 2;
    bounds.size.h -= 2;
    graphics_context_set_fill_color(context, progressdata->background_colour);
    graphics_fill_rect(context, bounds, 3, GCornersAll);
    bounds.size.w = ((progressdata->value - progressdata->min) * bounds.size.w) / (progressdata->max - progressdata->min);
    GCornerMask corners = GCornersLeft;
    if(bounds.size.w >= layer_get_bounds(bar).size.w - 4) {
        corners |= GCornersRight;
    }
    graphics_context_set_fill_color(context, progressdata->bar_colour);
    graphics_fill_rect(context, bounds, 3, corners);
}

void progress_bar_layer_destroy(ProgressBarLayer* bar) {
	layer_destroy(bar);
}


