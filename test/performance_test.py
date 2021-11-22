#!/usr/bin/python3

import time, threading, urllib.request

def stress_test():
	for i in range( 1, 100 ):
		f = urllib.request.urlopen( 'https://notdatum.github.io/Simple-Online-Game/test' )
		print( f.readline() )
		f.close()

def main():
	for i in range( 1, 100 ):
		t = threading.Thread( target = stress_test )
		t.start()

if __name__ == '__main__':
	main()