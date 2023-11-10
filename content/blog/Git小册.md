---
external: false
title: "Git小册"
description: It's a git booklet there.
date: 2023-11-07
---

## 在新的电脑上配置git

`$ git config --global user.name "[name]"`

对你的commit操作设置关联的用户名

`$ git config --global user.email "[email address]"`

对你的commit操作设置关联的邮箱地址

`$ git config --global color.ui auto`

启用有帮助的彩色命令行输出

## 仓库管理

`$ git remote add origin [url]`

将现有目录转换为一个 Git 仓库

`$ git clone [url]`

Clone 一个已存在于 GitHub 上的仓库

## 撤销/删除

`git reset [--hard] [HEAD]~[number] | [commit id]`

撤销本地的commit操作并返回到指定版本，HEAD~[number]表示撤销最近的number个commit操作，commit id表示撤销指定的commit操作

`git rm [-rf] [file name]`

强制删除文件，-r表示递归删除，-f表示从暂存区中强制删除

`git rebase -i [HEAD]~[number] | [commit id]`

将指定版本之后的commit操作合并为一个commit操作，HEAD~[number]表示合并最近的number个commit操作，commit id表示合并指定的commit操作，在打开的vim中，将想要被压缩的commit操作前的pick改为f，然后保存退出即可

## 协作

通过vscode可视化进行协作，基于主干分支中签出分支，开发完毕后合入主干分支/复合开发分支
