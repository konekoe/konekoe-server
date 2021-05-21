#ifndef HH_HANDLERS_OPS
#define HH_HANDLERS_OPS

#include "client_utils.h"

#define CONNECT "CONN0"
#define EXIT "EXIT0"

#define ACCEPT "ACCPT"

typedef struct
{
  const char* command;
  int (*fp)(struct Conn* conn, const char* cmd);
} handler_t;

int handle_incoming_cmd(struct Conn* conn);

//Helper function for command handlers that do not require sending a response to the server.
int dummy_handler(struct Conn* conn);

//Functions for sending messages to the server.

//Send time request to server.
int time_request(struct Conn* conn);

int send_screenshot(struct Conn* conn);

//Respond to ping.
int pong(struct Conn* conn);

//User has decided to logout.
int logout_handler(struct Conn* conn, const char* cmd);

int get_config(struct Conn* conn, const char* cmd);

int server_cmd_response(struct Conn* conn);

int daemon_log_low(struct Conn* conn, const char* msg, unsigned int size);

int daemon_log_hi(struct Conn* conn, const char* msg, unsigned int size);

//--------------------------------------------------

//Protocol handlers
int error_handler(struct Conn* conn, const char* cmd);

int ping(struct Conn* conn, const char* cmd);

int add_to_whitelist(struct Conn* conn, const char* cmd);

int remove_from_whitelist(struct Conn* conn, const char* cmd);

int add_to_blacklist(struct Conn* conn, const char* cmd);

int remove_from_blacklist(struct Conn* conn, const char* cmd);

int update_interval(struct Conn* conn, const char* cmd);

int screenshot_now(struct Conn* conn, const char* cmd);

int time_response(struct Conn* conn, const char* cmd);

int exam_end(struct Conn* conn, const char* cmd);

int server_cmd_no_response(struct Conn* conn, const char* cmd);

int server_cmd_and_respond(struct Conn* conn, const char* cmd);


#endif
