import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from pathlib import Path

from app.services.cos_service import COSService


class TestCOSService:
    """腾讯云COS存储服务测试"""
    
    @pytest.fixture
    def cos_service(self):
        """创建COS服务实例"""
        with patch('app.services.cos_service.CosS3Client'):
            return COSService()
    
    def test_init(self, cos_service):
        """测试COS服务初始化"""
        assert cos_service.bucket_name == ""  # 默认值
        assert cos_service.region == "ap-guangzhou"
        assert cos_service.client is not None
    
    @pytest.mark.asyncio
    async def test_upload_file_success(self, cos_service):
        """测试文件上传成功"""
        file_data = b"test file content"
        file_key = "test/file.txt"
        
        # Mock客户端响应
        cos_service.client.put_object = Mock(return_value={"ETag": "test-etag"})
        
        with patch.object(cos_service, '_upload_sync') as mock_upload:
            mock_upload.return_value = {"ETag": "test-etag"}
            
            result = await cos_service.upload_file(file_data, file_key, "text/plain")
            
            expected_url = f"https://{cos_service.bucket_name}.cos.{cos_service.region}.myqcloud.com/{file_key}"
            assert result == expected_url
    
    @pytest.mark.asyncio
    async def test_upload_file_from_path(self, cos_service):
        """测试从本地路径上传文件"""
        import tempfile
        
        # 创建临时文件
        with tempfile.NamedTemporaryFile(mode='w', delete=False) as f:
            f.write("test content")
            temp_path = f.name
        
        try:
            with patch.object(cos_service, 'upload_file') as mock_upload:
                mock_upload.return_value = "https://example.com/file.txt"
                
                result = await cos_service.upload_file_from_path(
                    temp_path, "test/file.txt"
                )
                
                assert result == "https://example.com/file.txt"
                mock_upload.assert_called_once()
        finally:
            os.unlink(temp_path)
    
    def test_get_file_url_default_domain(self, cos_service):
        """测试获取文件URL - 默认域名"""
        file_key = "test/file.txt"
        
        url = cos_service.get_file_url(file_key)
        
        expected = f"https://{cos_service.bucket_name}.cos.{cos_service.region}.myqcloud.com/{file_key}"
        assert url == expected
    
    def test_get_file_url_custom_domain(self, cos_service):
        """测试获取文件URL - 自定义域名"""
        cos_service.cos_domain = "custom-domain.com"
        file_key = "test/file.txt"
        
        url = cos_service.get_file_url(file_key)
        
        expected = f"https://custom-domain.com/{file_key}"
        assert url == expected
    
    @pytest.mark.asyncio
    async def test_delete_file_success(self, cos_service):
        """测试删除文件成功"""
        file_key = "test/file.txt"
        
        with patch.object(cos_service, '_delete_sync') as mock_delete:
            mock_delete.return_value = {"DeleteMarker": True}
            
            result = await cos_service.delete_file(file_key)
            
            assert result == True
            mock_delete.assert_called_once_with(file_key)
    
    @pytest.mark.asyncio
    async def test_delete_file_failure(self, cos_service):
        """测试删除文件失败"""
        file_key = "test/file.txt"
        
        with patch.object(cos_service, '_delete_sync') as mock_delete:
            mock_delete.side_effect = Exception("Delete failed")
            
            result = await cos_service.delete_file(file_key)
            
            assert result == False
    
    @pytest.mark.asyncio
    async def test_file_exists_true(self, cos_service):
        """测试文件存在检查 - 文件存在"""
        file_key = "test/file.txt"
        
        with patch.object(cos_service, '_head_object_sync') as mock_head:
            mock_head.return_value = {"ContentLength": 100}
            
            result = await cos_service.file_exists(file_key)
            
            assert result == True
    
    @pytest.mark.asyncio
    async def test_file_exists_false(self, cos_service):
        """测试文件存在检查 - 文件不存在"""
        file_key = "test/file.txt"
        
        with patch.object(cos_service, '_head_object_sync') as mock_head:
            from qcloud_cos.cos_exception import CosServiceError
            mock_head.side_effect = CosServiceError("NoSuchKey", "The specified key does not exist.")
            
            result = await cos_service.file_exists(file_key)
            
            assert result == False
    
    @pytest.mark.asyncio
    async def test_get_file_info_success(self, cos_service):
        """测试获取文件信息成功"""
        file_key = "test/file.txt"
        
        mock_response = {
            'Content-Length': '1024',
            'Content-Type': 'text/plain',
            'Last-Modified': 'Wed, 21 Oct 2025 07:28:00 GMT',
            'ETag': '"9bb58f26192e4ba00f01e2e7b136bbd8"'
        }
        
        with patch.object(cos_service, '_head_object_sync') as mock_head:
            mock_head.return_value = mock_response
            
            result = await cos_service.get_file_info(file_key)
            
            assert result is not None
            assert result["file_key"] == file_key
            assert result["content_length"] == '1024'
            assert result["content_type"] == 'text/plain'
    
    @pytest.mark.asyncio
    async def test_get_file_info_failure(self, cos_service):
        """测试获取文件信息失败"""
        file_key = "test/file.txt"
        
        with patch.object(cos_service, '_head_object_sync') as mock_head:
            mock_head.side_effect = Exception("File not found")
            
            result = await cos_service.get_file_info(file_key)
            
            assert result is None
    
    def test_generate_file_key_basic(self, cos_service):
        """测试文件键名生成 - 基本功能"""
        filename = "test.txt"
        
        key = cos_service.generate_file_key(filename, "uploads", False)
        
        assert key == "uploads/test.txt"
    
    def test_generate_file_key_with_timestamp(self, cos_service):
        """测试文件键名生成 - 包含时间戳"""
        filename = "test.txt"
        
        key = cos_service.generate_file_key(filename, "uploads", True)
        
        assert key.startswith("uploads/")
        assert key.endswith("_test.txt")
        assert len(key.split("/")[1].split("_")[0]) == 15  # 时间戳长度
    
    def test_sanitize_file_key(self, cos_service):
        """测试文件键名清理"""
        dirty_key = "path with spaces/file name.txt"
        
        clean_key = cos_service._sanitize_file_key(dirty_key)
        
        assert clean_key == "path_with_spaces/file_name.txt"
    
    def test_guess_content_type(self, cos_service):
        """测试MIME类型推断"""
        test_cases = [
            ("test.mp4", "video/mp4"),
            ("test.jpg", "image/jpeg"),
            ("test.txt", "text/plain"),
            ("test.unknown", "application/octet-stream")
        ]
        
        for filename, expected in test_cases:
            result = cos_service._guess_content_type(filename)
            assert result == expected
    
    @pytest.mark.asyncio
    async def test_test_connection_success(self, cos_service):
        """测试连接测试成功"""
        with patch.object(cos_service, '_list_objects_sync') as mock_list:
            mock_list.return_value = {"Contents": []}
            
            result = await cos_service.test_connection()
            
            assert result == True
    
    @pytest.mark.asyncio
    async def test_test_connection_failure(self, cos_service):
        """测试连接测试失败"""
        with patch.object(cos_service, '_list_objects_sync') as mock_list:
            mock_list.side_effect = Exception("Connection failed")
            
            result = await cos_service.test_connection()
            
            assert result == False