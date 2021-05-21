#include <sys/socket.h>  // defines socket, connect, ...
#include <netinet/in.h>  // defines sockaddr_in
#include <string.h>      // defines memset
#include <stdio.h>       // defines printf, perror, ...
#include <arpa/inet.h>   // inet_pton, ...
#include <unistd.h>      // read, ...
#include <stdlib.h>

int receive_int(unsigned int *num, int fd)
{
  printf("\n%s\n", "Receiving int");

  uint32_t ret = 0;
  char *data = (char*)&ret;
  int left = sizeof(ret);
  int rc;

  printf("\t%s\n", "Reading...");
  do {
    rc = read(fd, data, left);

    if (rc < 0)
    {
      return 1;
    }
    else if (rc == 0) return 0;
    else
    {
      data += rc;
      left -= rc;
    }
  }
  while (left > 0);

  *num = ntohl(ret);

  printf("\t%s\n%s %u\n", "Finished reading!", "Returning", *num);
  return 0;
}

int send_int(const unsigned int num, int fd)
{
  printf("\n%s%u\n", "Sending int: ", num);

  uint32_t conv = htonl(num);
  char *data = (char*)&conv;
  int left = sizeof(conv);
  int rc;

  printf("\t%s\n", "Writing...");
  do {
    rc = write(fd, data, left);
    if (rc < 0) {
      return 1;
    }
    else {
      data += rc;
      left -= rc;
    }
  }
  while (left > 0);
  printf("\t%s\n", "Finished writing!");
  return 0;
}

int receive_char_arr(char* str, const int size, int fd)
{
  printf("\n%s\n", "Receiving char arr");
  ssize_t r = 0;

  printf("\t%s\n", "Reading...");
  while (size > r)
  {
    if ((r += recv(fd, str + r, size - r, 0)) < 1 )
    {
      if (r == 0) return 0;
      return 1;
    }
  }
  str[r] = 0;

  printf("\t%s\n%s %s\n", "Finished reading!", "Returning", str);
  return 0;
}

int send_char_arr(const char* str, int size, int fd)
{
  printf("\n%s%s\n", "Sending char arr: ", str);
  ssize_t wr = 0;

  printf("\t%s\n", "Writing...");

  while (wr < size)
  {
    if ((wr += send(fd, str + wr, size - wr, 0)) < 0 )
    {
      return 1;
    }
  }

  printf("\t%s\n", "Finished writing!");
  return 0;
}

int receive_command(char* str, int fd)
{
  return receive_char_arr(str, 5, fd);
}

int send_command(const char* str, int fd)
{
  return send_char_arr(str, 5, fd);
}
