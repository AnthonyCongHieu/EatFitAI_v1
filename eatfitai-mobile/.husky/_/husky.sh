#!/bin/sh
if [ -z "$husky_skip_init" ]; then
  export husky_skip_init=1
  . "$0" "$@"
  husky_skip_init=
fi
