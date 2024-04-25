#!/bin/bash

#=============== Update version before commit: minor + 1 ==========================

c='\033[0;35m'
y='\033[0;33m'
c0='\033[0;0m'
g='\033[0;32m'
set -e

update_version(){
    old_version=`cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[\",]//g' | tr -d '[[:space:]]'`
    echo -e "$c**** Old version is $g$old_version$c ****$c0"
    version_split=( ${old_version//./ } )
    major=${version_split[0]:-0}
    minor=${version_split[1]:-0}
    patch=${version_split[2]:-0}
    let "patch=patch+1"
    new_version="${major}.${minor}.${patch}"

    repo=`cat package.json | grep name | head -1 | awk -F: '{ print $2 }' | sed 's/[\",]//g' | tr -d '[[:space:]]'`
    echo -e "$c**** Bumping version of $g$repo$c: $y$old_version$c -> $g$new_version$c  ****$c0"
    sed -i -e "0,/$old_version/s/$old_version/$new_version/" package.json
    echo -e "$g"
    npm version 2>&1 | head -2 | tail -1
    echo -e "$c0"
}

update_version

git add --all
git commit -m "$old_version" --no-verify
git push github refs/heads/master:master

read -p "Press any key to resume ..."
