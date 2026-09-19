/** 内置演示数据：覆盖 1:1、1:N、N:1、单侧与冲突场景 */

export const DEMO_A = `1
00:00:01,000 --> 00:00:03,000
Hello, world.

2
00:00:03,500 --> 00:00:05,000
This is a demo subtitle file.

3
00:00:05,500 --> 00:00:07,000
It demonstrates alignment.

4
00:00:07,200 --> 00:00:09,000
One to many and many to one.

5
00:00:10,000 --> 00:00:12,000
A conflict line here.

6
00:00:13,000 --> 00:00:14,000
Final line part one,

7
00:00:14,000 --> 00:00:15,500
and part two.
`;

export const DEMO_B = `1
00:00:01,100 --> 00:00:03,100
Hello world!

2
00:00:03,600 --> 00:00:04,200
This is a demo

3
00:00:04,200 --> 00:00:05,100
subtitle file.

4
00:00:05,600 --> 00:00:07,100
It demonstrates alignment.

5
00:00:07,300 --> 00:00:08,000
One to many

6
00:00:08,000 --> 00:00:09,100
and many to one.

7
00:00:10,100 --> 00:00:12,200
A completely different sentence that conflicts.

8
00:00:13,100 --> 00:00:15,600
Final line part one, and part two.

9
00:00:16,500 --> 00:00:18,000
Extra line only in B.
`;
