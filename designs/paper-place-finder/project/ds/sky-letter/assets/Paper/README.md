# 纸笔素材

| 文件 | 用途 |
| --- | --- |
| rule.png | 铅笔分隔横线，允许横向伸缩，不作为输入焦点 |
| mark.png | 当前项的朱砂笔迹，配合文字与语义状态 |
| seal.png | 历史印章原件，不用于当前评分卡 |
| clip.png | 黄铜纸夹，靠纸缘放置，不遮挡正文与点击目标 |
| paper-grain-note.png | 短札记与辅助纸面的无描边淡纸纹；600×510 |
| paper-grain-tall.png | 月相与地点长纸面的无描边淡纸纹；510×660 |
| paper-grain-wide.png | 评分、时间、天气批注与七日共用的无描边淡纸纹；1080×510 |
| score-annotations.png | 主分数开口圈、等级引线与建议括注；数字和文字独立 |
| home-time-marks.png | 时间与观赏窗口的轻笔迹；只叠背景 |
| supporting-paper-mask.svg | 四种主纸笺共用的平缓微弯轮廓；遮罩背景和装饰，不裁文字与焦点 |
| supporting-brace.png | 云层、空气分组侧括号 |
| supporting-pencil.png | 组标题、关注数值和当前日期的铅笔划线 |
| supporting-leader.png | 关联主要扣分项的弯曲旁批引线 |
| supporting-rule.png | 干笔细分隔线，不围合成边框 |
| outlook-focus.png | 最高日及小型数据摘要的开口圈，配合文字状态 |

原始四种装饰素材按源稿字节保留。三种纸纹由 pen-pencil-art 生成，固定种子 `sky-letter-grain-{note,tall,wide}-1`；生成源为系统目录的 `src/render-paper-grain.cjs`。近白不透明底以 multiply 混合主题纸色，只缩放背景，文字保持原生。不含描边、复描角线或沿边擦痕；轮廓与局部投影由纸面样式承担。高对比模式不用纹理。作为装饰时 alt 为空，不能单独传递状态。上一轮带描边纸面已退出当前素材目录，不再用于设计稿；上传原件仅留作历史。
