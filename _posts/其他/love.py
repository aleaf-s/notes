from tkinter import *
from math import sin, cos, pi, log
import random
import time
from PIL import Image, ImageDraw, ImageTk

CANVAS_WIDTH = 640
CANVAS_HEIGHT = 480
CANVAS_CENTER_X = CANVAS_WIDTH / 2
CANVAS_CENTER_Y = CANVAS_HEIGHT / 2
IMAGE_ENLARGE = 11


def scatter_inside(x, y, beta=0.15): # log scatter & scatter inside
    ratiox = - beta * log(random.random())
    ratioy = - beta * log(random.random())
    dx = ratiox * (x - CANVAS_CENTER_X)
    dy = ratioy * (y - CANVAS_CENTER_Y)
    return x - dx, y - dy

def heart_function(t, enlarge_ratio: float = IMAGE_ENLARGE):
    # heart function
    x = 16 * (sin(t)**3)
    y = -(13 * cos(t) - 5 * cos(2*t) - 2 * cos(3*t) - cos(4*t))
    # enlarge
    x *= enlarge_ratio
    y *= enlarge_ratio
    # shift to the center of canvas
    x += CANVAS_CENTER_X
    y += CANVAS_CENTER_Y
    return int(x), int(y)

def shrink(x, y, ratio):
    sk_range = -1 / ((x-CANVAS_CENTER_X) ** 2 + (y-CANVAS_CENTER_Y) ** 2)
    dx = ratio * sk_range * (x-CANVAS_CENTER_X)
    dy = ratio * sk_range * (y-CANVAS_CENTER_Y)
    return x - dx, y - dy


class Heart:
    def __init__(self, frame):
        self.points = set()
        self.edge_points = set()
        self.inside_points = set()
        self.all_points = {}
        
        self.build(1000) 
        
        self.frame = frame
        
        # 预计算
        for f in range(frame):
            self.calc(f)
            
        self.tk_image = None

    def build(self, number):
        # randomly find 'number' points on the heart curve
        for _ in range(number):
            t = random.uniform(0, 2 * pi)
            x, y = heart_function(t)
            x, y = shrink(x, y, -1000)
            self.points.add((int(x), int(y)))
        
        # on the edge
        for px, py in self.points:
            for _ in range(3):
                x, y = scatter_inside(px, py, 0.05)
                self.edge_points.add((x, y))
        
        # inside the heart
        pt_ls = list(self.points)
        
        # *** 优化 1: 轻微减少粒子数 ***
        for _ in range(2000): # 原为 4000
            x, y = random.choice(pt_ls)
            x, y = scatter_inside(x, y)
            self.inside_points.add((x, y))

    def cal_position(self, x, y, ratio):
        bt_range = 1 / ((x-CANVAS_CENTER_X) ** 2 + (y-CANVAS_CENTER_Y) ** 2)
        dx = ratio * bt_range * (x-CANVAS_CENTER_X) + random.randint(-1, 1)
        dy = ratio * bt_range * (y-CANVAS_CENTER_Y) + random.randint(-1, 1)
        return x - dx, y - dy

    def calc(self, frame):
        ratio = 800 * sin(frame / 10 * pi)
        all_pts = []

        # for halo
        halo_radius = int(4 + 6 * (1 + sin(self.frame / 10 * pi)))
        
        halo_number = int(1500 + 2000 * abs(sin(self.frame / 10 * pi) ** 2)) # 原为 3000 + 4000
        
        heart_halo_point = set() 
        for _ in range(halo_number):
            t = random.uniform(0, 2 * pi)
            x, y = heart_function(t, enlarge_ratio=11.6) 
            x, y = shrink(x, y, halo_radius)
            if (x, y) not in heart_halo_point:
                heart_halo_point.add((x, y))
                x += random.randint(-14, 14)
                y += random.randint(-14, 14)
                size = random.choice((1, 2, 2))
                all_pts.append((x, y, size))

        # on the curve
        for x, y in self.points:
            x, y = self.cal_position(x, y, ratio)
            size = random.randint(1, 3)
            all_pts.append((x, y, size))

        # on the edge
        for x, y in self.edge_points:
            x, y = self.cal_position(x, y, ratio)
            size = random.randint(1, 2)
            all_pts.append((x, y, size))

        # inside
        for x, y in self.inside_points:
            x, y = self.cal_position(x, y, ratio)
            size = random.randint(1, 2)
            all_pts.append((x, y, size))
        
        self.all_points[frame] = all_pts

    def render(self, canvas, frame):
        # 1. 在内存中创建一张新的黑色图片
        img = Image.new('RGB', (CANVAS_WIDTH, CANVAS_HEIGHT), color='black')
        draw_context = ImageDraw.Draw(img)
        
        # 2. 获取当前帧的所有点
        points_to_draw = self.all_points[frame % self.frame]
        color = '#ff7171' # 原始颜色

        # 3. 在内存图片上绘制所有点 (这一步非常快)
        for x, y, size in points_to_draw:
            # PIL 的 rectangle 用 [x0, y0, x1, y1]
            draw_context.rectangle([x, y, x + size, y + size], fill=color)

        # 4. 将 PIL 图片转换为 Tkinter 能识别的 PhotoImage
        #    必须将其存储在 self 属性中，否则会被垃圾回收！
        self.tk_image = ImageTk.PhotoImage(img)

        # 5. 在画布上绘制 *一个* 图像对象，而不是成千上万个矩形
        canvas.create_image(0, 0, anchor='nw', image=self.tk_image)

# --- 渲染循环 (保持不变) ---

def draw(root: Tk, canvas: Canvas, heart: Heart, frame=0):
    canvas.delete('all') 
    heart.render(canvas, frame) 
    root.after(30, draw, root, canvas, heart, frame+1)

if __name__ == '__main__':
    root = Tk()
    root.title('祝小牛牛开开心心，不发脾气') 
    canvas = Canvas(root, bg='black', height=CANVAS_HEIGHT, width=CANVAS_WIDTH)
    canvas.pack()
    
    print("正在预计算，请稍候...")
    start_time = time.time()
    
    heart = Heart(10) 
    
    end_time = time.time()
    print(f"预计算完成，耗时 {end_time - start_time:.2f} 秒。")
    
    draw(root, canvas, heart)
    root.mainloop()