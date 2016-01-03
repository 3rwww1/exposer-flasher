#!/bin/bash

case "$ACTION" in
    init)

        ;;
    start)
        echo "$self: START"
        ;;
    download)
        curl http://localhost:3000/flash/false
        echo "$self: DOWNLOAD to $ARGUMENT"
        ;;
    stop)
        echo "$self: STOP"
        ;;
    *)
        echo "$self: Unknown action: $ACTION"
        ;;
esac

exit 0
