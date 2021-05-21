#include "client_handlers.h"
#include <string.h>
#include <stdio.h>
#include <stdlib.h>

static handler_t cmd_handlers[] =
{
  {"PING0", &ping}, //Send PONG0 as a response
  {"ADDWL", &add_to_whitelist},
  {"REMWL", &remove_from_whitelist},
  {"ADDBL", &add_to_blacklist},
  {"REMBL", &remove_from_blacklist},
  {"SCRTM", &update_interval},
  {"SCRNW", &screenshot_now},
  {"TMRSP", &time_response},
  {"EXEND", &exam_end},
  {"CMD00", &server_cmd_no_response},
  {"CMD01", &server_cmd_and_respond} //Respond with CMDRT.
};

int handle_incoming_cmd(struct Conn* conn) {
  char command[LENGTH_OF_COMMAND];

  if (receive_command(command, conn->socket))
  {
    return 1;
  }
  else
  {
    for(int j = 0; j < sizeof(cmd_handlers)/sizeof(cmd_handlers[0]); j++)
    {
      if(!strncmp(cmd_handlers[j].command, command, LENGTH_OF_COMMAND))
      {

        if ( cmd_handlers[j].fp(conn, command) )
        {
          return 1;
        }
        return 0;
      }
    }
    //Command not found.
    return 0;
  }

}

int dummy_handler(struct Conn* conn)
{
  unsigned int length;

  if ( receive_int(&length, conn->socket) )
  {
    perror("reading error");
    return 1;
  }

  char msg[length];

  if ( receive_char_arr(msg, length, conn->socket) )
  {
    perror("reading error");
    return 1;
  }

  return 0;
}

int time_request(struct Conn* conn)
{
  const char* cmd = "TMREQ";

  if (send_command(cmd, conn->socket))
  {
    perror("writing error");
    return 1;
  }

  if ( send_int(0, conn->socket) )
  {
    perror("writing error");
    return 1;
  }

  return 0;
}

int send_screenshot(struct Conn* conn)
{
  printf("Sending screenshot.\n");

  FILE * target;

  //There should be a test image to send.
  target = fopen("test_1080.png", "r");

  fseek(target, 0, SEEK_END);

  unsigned int fsize = ftell(target);

  rewind(target);

  char *msg;

  if ( send_command("SCRDT", conn->socket) )
  {
    perror("writing error");
    return 1;
  }

  if ( send_int(fsize, conn->socket) )
  {
    perror("writing error");
    return 1;
  }

  msg = (char*) malloc(fsize);

  fread(msg, fsize, 1, target);

  if ( send_char_arr(msg, fsize/2, conn->socket) )
  {
    perror("writing error");
    free(msg);
    return 1;
  }

  if ( send_char_arr(msg + fsize/2, fsize - (fsize/2), conn->socket) )
  {
    perror("writing error");
    free(msg);
    return 1;
  }

  free(msg);

  return 0;
}

int pong(struct Conn* conn)
{
  return 1;
}

int logout_handler(struct Conn* conn, const char* cmd)
{
  send_command(cmd, conn->socket);

  if ( send_int(0, conn->socket) )
  {
    perror("writing error");
    return 1;
  }

  char message_start[5];

  if ( receive_command(message_start, conn->socket) )
  {
    perror("reading error");
    return 1;
  }

  return 0;
}

//Student presses 'OK' on the GUI.
int get_config(struct Conn* conn, const char* cmd)
{
  printf("%s presses OK on the gui to fetch a configuration file for %s\n",
        conn->student_id, conn->exam_code);

  char data[strlen(conn->exam_code) + strlen(conn->student_id) + 1];

  sprintf(data, "%s;%s", conn->exam_code, conn->student_id);

  unsigned int un = strlen(data);
  printf("%d\n", un);

  if ( send_command(cmd, conn->socket) )
  {
    perror("writing error");
    return 1;
  }

  if ( send_int(un, conn->socket) )
  {
    perror("writing error");
    return 1;
  }

  if ( send_char_arr(data, un, conn->socket) )
  {
    perror("writing error");
    return 1;
  }

  char response[6];

  if ( receive_command(response, conn->socket) )
  {
    perror("reading error");
    return 1;
  }

  //Check initial connection status.
  if (strcmp(response, "ACCPT") == 0)
  {
    unsigned int length_of_file;

    if ( receive_int(&length_of_file, conn->socket) )
    {
      perror("reading error");
      return 1;
    }

    char file[length_of_file];

    if ( receive_char_arr(file, length_of_file, conn->socket) )
    {
      perror("reading error");
      return 1;
    }

  }
  else {
    printf("Server returned an error: %s\n", response);
    return 1;
  }

  return 0;
}

int server_cmd_response(struct Conn* conn)
{
  char* msg = "Hello, I am a test client.";
  unsigned int size = 26;

  if ( send_command("CMDRT", conn->socket) )
  {
    perror("writing error");
    return 1;
  }

  if ( send_int(size, conn->socket) )
  {
    perror("writing error");
    return 1;
  }

  if ( send_char_arr(msg, size, conn->socket) )
  {
    perror("writing error");
    return 1;
  }

  return 0;
}

int daemon_log_low(struct Conn* conn, const char* msg, unsigned int size)
{
  if ( send_command("LOGLO", conn->socket) )
  {
    perror("writing error");
    return 1;
  }

  if ( send_int(size, conn->socket) )
  {
    perror("writing error");
    return 1;
  }

  if ( send_char_arr(msg, size, conn->socket) )
  {
    perror("writing error");
    return 1;
  }

  return 0;
}

int daemon_log_hi(struct Conn* conn, const char* msg, unsigned int size)
{
  if ( send_command("LOGHI", conn->socket) )
  {
    perror("writing error");
    return 1;
  }

  if ( send_int(size, conn->socket) )
  {
    perror("writing error");
    return 1;
  }

  if ( send_char_arr(msg, size, conn->socket) )
  {
    perror("writing error");
    return 1;
  }

  return 0;
}

//Handlers
int error_handler(struct Conn* conn, const char* cmd)
{
  return 1;
}

int ping(struct Conn* conn, const char* cmd)
{
  return 1;
}

int add_to_whitelist(struct Conn* conn, const char* cmd)
{
  return dummy_handler(conn);
}

int remove_from_whitelist(struct Conn* conn, const char* cmd)
{
  return dummy_handler(conn);
}

int add_to_blacklist(struct Conn* conn, const char* cmd)
{
  return dummy_handler(conn);
}

int remove_from_blacklist(struct Conn* conn, const char* cmd)
{
  return dummy_handler(conn);
}

//No need to actually update.
int update_interval(struct Conn* conn, const char* cmd)
{
  return dummy_handler(conn);
}

//Server requests a screenshot.
int screenshot_now(struct Conn* conn, const char* cmd)
{
  printf("%s received a request for a screenshot.\n", conn->student_id);
  if (send_screenshot(conn))
  {
    return 1;
  }
  return 0;
}

int time_response(struct Conn* conn, const char* cmd)
{
  return dummy_handler(conn);
}

//TODO: What to do when the exam ends?
int exam_end(struct Conn* conn, const char* cmd)
{
  return 1;
}

int server_cmd_no_response(struct Conn* conn, const char* cmd)
{
  return dummy_handler(conn);
}

int server_cmd_and_respond(struct Conn* conn, const char* cmd)
{
  if ( dummy_handler(conn) )
  {
    return 1;
  }

  return server_cmd_response(conn);
}
