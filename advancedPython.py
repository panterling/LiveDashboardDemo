import copy

# Definition for a binary tree node.
class TreeNode(object):
    def __init__(self, x):
        self.val = x
        self.left = None
        self.right = None

class Solution(object):
    def invertTree(self, root):
        """
        :type root: TreeNode
        :rtype: TreeNode
        """

        if root == None:
            return None

        else:
            temp = copy.deepcopy(root.left)
            root.left = self.invertTree(root.right)
            root.right = self.invertTree(temp)

        return root

    def depthFirst(self, root):
        if root is not None:
            ret = " | " + str(root.val)
            ret += self.depthFirst(root.left)
            ret += self.depthFirst(root.right)
        else:
            ret = ""
        return ret


ll = TreeNode(2)
ll.left = TreeNode(1)
ll.right = TreeNode(3)

rr = TreeNode(7)
rr.left = TreeNode(6)
rr.right = TreeNode(9)

root = TreeNode(4)
root.left = ll
root.right = rr

s = Solution()
newRoot = s.invertTree(root)

print(s.depthFirst(newRoot))
